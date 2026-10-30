import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import multer from 'multer';
import QRCode from 'qrcode';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { asyncRoute, HttpError } from './errors.js';
import { getPublicDemoMenu } from './demo-menus.js';
import { publicAuditEvent, recordAudit } from './audit.js';
import {
  authorizeRestaurant, EDITOR_GRANTABLE_PERMISSIONS, GLOBAL_ROLE, isSuperAdmin,
  MEMBERSHIP_ROLE, PERMISSION, permissionsForMembership, requireSuperAdmin,
} from './rbac.js';
import {
  assertValidPassword, clearSessionCookie, createSession, getSessionUser, hashPassword,
  newOpaqueToken, normalizeEmail, publicUser, revokeCurrentSession, setSessionCookie,
  sha256, verifyPassword,
} from './security.js';
import {
  categorySchema, categoryUpdateSchema, invitationAcceptSchema, inviteSchema,
  loginSchema, membershipUpdateSchema, menuItemSchema, menuItemUpdateSchema,
  restaurantCreateSchema, restaurantStatusSchema, restaurantUpdateSchema, userStatusSchema,
} from './validation.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, '../public');
const UPLOAD_DIR = path.join(PUBLIC_DIR, 'uploads');
const ADMIN_ROLES = new Set(Object.values(MEMBERSHIP_ROLE));

const idSchema = z.object({ userId: z.string().min(1).max(80), role: z.enum(['RESTAURANT_ADMIN', 'MENU_EDITOR']), permissions: z.array(z.enum(EDITOR_GRANTABLE_PERMISSIONS)).max(6).optional() }).strict();
const settingsSchema = z.object({ supportEmail: z.string().trim().email().max(254).or(z.literal('')), defaultCurrency: z.string().trim().regex(/^[A-Z]{3}$/), timezone: z.string().trim().min(1).max(80) }).strict();

const clampPage = (value) => Math.max(1, Math.min(100000, Number.parseInt(value ?? '1', 10) || 1));
const clampLimit = (value) => Math.max(1, Math.min(100, Number.parseInt(value ?? '20', 10) || 20));
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const now = () => new Date();

function parseBody(schema, body) {
  const parsed = schema.safeParse(body ?? {});
  if (!parsed.success) throw new HttpError(400, 'Request validation failed.', 'VALIDATION_ERROR');
  return parsed.data;
}

function safeRestaurant(restaurant) {
  return {
    id: restaurant._id,
    name: restaurant.name,
    slug: restaurant.slug,
    description: restaurant.description ?? '',
    menuHeaderNote: restaurant.menuHeaderNote ?? '',
    menuAnnouncement: restaurant.menuAnnouncement ?? '',
    contact: restaurant.contact ?? {},
    logoUrl: restaurant.logoUrl ?? '',
    coverImageUrl: restaurant.coverImageUrl ?? '',
    isActive: restaurant.isActive === true,
    menuEditorManagementEnabled: restaurant.menuEditorManagementEnabled === true,
    menuVersion: restaurant.menuVersion ?? 0,
    publishedAt: restaurant.publishedAt ?? null,
    createdAt: restaurant.createdAt,
    updatedAt: restaurant.updatedAt,
    menuItemCount: restaurant.menuItemCount ?? undefined,
    restaurantAdminName: restaurant.restaurantAdminName ?? undefined,
    membershipRole: restaurant.membershipRole ?? undefined,
  };
}

function pageResult(rows, total, page, limit) {
  return { data: rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

function csvCell(value) {
  let text = String(value ?? '');
  if (/^\s*[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
function sendCsv(res, filename, headers, rows) {
  res.type('text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send([headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n'));
}

function makeSearch(field, search) {
  const pattern = search.trim();
  if (!pattern) return null;
  return { [field]: { $regex: escapeRegex(pattern), $options: 'i' } };
}

async function getMembershipContext(db, user) {
  const memberships = await db.collection('memberships').find({ userId: user._id, isActive: true }).toArray();
  const results = [];
  for (const membership of memberships) {
    if (!ADMIN_ROLES.has(membership.role)) continue;
    if (membership.role === MEMBERSHIP_ROLE.MENU_EDITOR && !permissionsForMembership(membership).includes(PERMISSION.MENU_READ)) continue;
    const restaurant = await db.collection('restaurants').findOne({ _id: membership.restaurantId });
    if (!restaurant) continue;
    results.push({
      restaurantId: restaurant._id,
      restaurantName: restaurant.name,
      restaurantSlug: restaurant.slug,
      role: membership.role,
      permissions: permissionsForMembership(membership),
      restaurantActive: restaurant.isActive === true,
      membershipId: membership._id,
    });
  }
  return results;
}

function requireAuth(req, _res, next) {
  if (!req.user) return next(new HttpError(401, 'Authentication required.', 'UNAUTHENTICATED'));
  next();
}

function requireSuper(req, _res, next) {
  return requireSuperAdmin(req.user).then(() => next(), next);
}

function createRestaurantGuard(db, permission) {
  return asyncRoute(async (req, _res, next) => {
    req.restaurantAccess = await authorizeRestaurant(db, req.user, req.params.restaurantId, permission);
    next();
  });
}

function apiErrorHandler(error, _req, res, _next) {
  if (res.headersSent) return;
  if (error?.code === 11000) {
    return res.status(409).json({ error: { code: 'CONFLICT', message: 'A record with that value already exists.' } });
  }
  if (error instanceof multer.MulterError) {
    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({ error: { code: 'UPLOAD_ERROR', message: status === 413 ? 'File exceeds the upload size limit.' : 'Upload could not be processed.' } });
  }
  const status = Number.isInteger(error?.status) ? error.status : 500;
  const message = status >= 500 ? 'An unexpected server error occurred.' : error.message;
  if (status >= 500) console.error(`[${res.getHeader('X-Request-ID') ?? 'no-request-id'}] request failed (${error?.name ?? 'Error'})`);
  return res.status(status).json({ error: { code: error?.code ?? 'INTERNAL_ERROR', message } });
}

export function createApp({ db, config = {} }) {
  if (!db) throw new Error('createApp requires a database adapter.');
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    req.requestId = randomUUID();
    res.setHeader('X-Request-ID', req.requestId);
    if (req.path.startsWith('/api/')) res.setHeader('Cache-Control', 'no-store, private');
    next();
  });
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'https:', 'data:', 'blob:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: config.production ? ["'none'"] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
    frameguard: config.production ? { action: 'deny' } : false,
  }));
  app.use(express.json({ limit: '1mb', strict: true }));
  app.use(express.urlencoded({ extended: false, limit: '16kb' }));

  const uploadLimit = (Number(config.uploadMaxMb) || 5) * 1024 * 1024;
  const imageUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: uploadLimit, files: 1 },
    fileFilter: (_req, file, cb) => {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) return cb(new HttpError(415, 'Upload a JPEG, PNG, or WebP image.', 'UNSUPPORTED_MEDIA_TYPE'));
      cb(null, true);
    },
  }).single('file');

  app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '365d', immutable: true, fallthrough: false }));
  app.use(express.static(PUBLIC_DIR, {
    index: 'index.html',
    setHeaders(res, filePath) {
      if (filePath.endsWith(`${path.sep}sw.js`)) res.setHeader('Cache-Control', 'no-cache');
      if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
    },
  }));

  app.use('/api', (req, res, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const origin = req.get('origin');
      if (origin && origin !== `${req.protocol}://${req.get('host')}`) {
        return next(new HttpError(403, 'Cross-origin request rejected.', 'CSRF_REJECTED'));
      }
    }
    next();
  });
  app.use('/api', asyncRoute(async (req, _res, next) => {
    req.user = await getSessionUser(db, req);
    next();
  }));

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: { code: 'RATE_LIMITED', message: 'Too many sign-in attempts. Try again later.' } },
  });

  app.post('/api/auth/login', loginLimiter, asyncRoute(async (req, res) => {
    const payload = parseBody(loginSchema, req.body);
    const emailNormalized = normalizeEmail(payload.email);
    const user = await db.collection('users').findOne({ emailNormalized });
    const passwordMatches = user ? await verifyPassword(payload.password, user.passwordHash) : false;
    if (!user || user.isActive !== true || !passwordMatches) {
      throw new HttpError(401, 'Email or password is incorrect.', 'INVALID_CREDENTIALS');
    }
    await revokeCurrentSession(db, req);
    const session = await createSession(db, user._id, Number(config.sessionTtlHours) || 12);
    await db.collection('users').updateOne({ _id: user._id }, { $set: { lastLoginAt: now(), updatedAt: now() } });
    setSessionCookie(res, session.token, { secure: config.production === true, maxAgeSeconds: (Number(config.sessionTtlHours) || 12) * 3600 });
    const current = await db.collection('users').findOne({ _id: user._id });
    res.json({ user: publicUser(current), memberships: await getMembershipContext(db, current) });
  }));

  app.post('/api/auth/logout', asyncRoute(async (req, res) => {
    await revokeCurrentSession(db, req);
    clearSessionCookie(res, { secure: config.production === true });
    res.status(204).end();
  }));

  app.get('/api/auth/me', requireAuth, asyncRoute(async (req, res) => {
    res.json({ user: publicUser(req.user), memberships: await getMembershipContext(db, req.user) });
  }));

  app.post('/api/invitations/accept', asyncRoute(async (req, res) => {
    const payload = parseBody(invitationAcceptSchema, req.body);
    const tokenHash = sha256(payload.token);
    const invitation = await db.collection('invitations').findOne({ tokenHash, consumedAt: { $exists: false }, revokedAt: { $exists: false } });
    if (!invitation || !(invitation.expiresAt instanceof Date) || invitation.expiresAt <= now()) {
      throw new HttpError(400, 'Invitation is invalid, expired, or already used.', 'INVITATION_INVALID');
    }
    const restaurant = await db.collection('restaurants').findOne({ _id: invitation.restaurantId });
    if (!restaurant || restaurant.isActive !== true) throw new HttpError(403, 'This restaurant is not accepting invitations.', 'RESTAURANT_SUSPENDED');

    let user = await db.collection('users').findOne({ emailNormalized: invitation.emailNormalized });
    let newlyCreated = false;
    if (user) {
      if (!req.user || req.user._id !== user._id) throw new HttpError(401, 'Sign in with the invited account to accept this invitation.', 'SIGN_IN_REQUIRED');
      if (payload.password || payload.name) throw new HttpError(400, 'Existing accounts must sign in before accepting this invitation; account credentials cannot be changed here.', 'CREDENTIAL_CHANGE_NOT_ALLOWED');
    } else {
      if (req.user) throw new HttpError(403, 'This invitation belongs to a different account.', 'INVITATION_ACCOUNT_MISMATCH');
      if (!payload.name || !payload.password) throw new HttpError(400, 'Name and a new password are required.', 'INVITATION_DETAILS_REQUIRED');
      assertValidPassword(payload.password);
      const userId = randomUUID();
      const createdAt = now();
      user = {
        _id: userId,
        name: payload.name,
        email: invitation.email,
        emailNormalized: invitation.emailNormalized,
        passwordHash: await hashPassword(payload.password),
        globalRole: null,
        isActive: true,
        emailVerifiedAt: createdAt,
        lastLoginAt: null,
        createdAt,
        updatedAt: createdAt,
      };
      newlyCreated = true;
    }

    const consumeResult = await db.collection('invitations').updateOne(
      { _id: invitation._id, consumedAt: { $exists: false }, revokedAt: { $exists: false }, expiresAt: { $gt: now() } },
      { $set: { consumedAt: now() } },
    );
    if (!consumeResult.matchedCount) throw new HttpError(400, 'Invitation is invalid, expired, or already used.', 'INVITATION_INVALID');

    if (newlyCreated) await db.collection('users').insertOne(user);
    const memberships = db.collection('memberships');
    const existingMembership = await memberships.findOne({ userId: user._id, restaurantId: invitation.restaurantId });
    const membership = {
      _id: existingMembership?._id ?? randomUUID(),
      userId: user._id,
      restaurantId: invitation.restaurantId,
      role: invitation.role,
      permissions: invitation.role === MEMBERSHIP_ROLE.MENU_EDITOR ? invitation.permissions : [],
      isActive: true,
      createdAt: existingMembership?.createdAt ?? now(),
      updatedAt: now(),
    };
    if (existingMembership) {
      const { _id: _membershipId, ...membershipFields } = membership;
      await memberships.updateOne({ _id: existingMembership._id }, { $set: membershipFields });
    } else await memberships.insertOne(membership);

    await recordAudit(db, {
      actor: user,
      restaurantId: invitation.restaurantId,
      action: 'MEMBERSHIP_ACCEPTED',
      targetEntityType: 'membership',
      targetEntityId: membership._id,
      changes: { role: membership.role },
      requestId: req.requestId,
    });

    if (newlyCreated) {
      const session = await createSession(db, user._id, Number(config.sessionTtlHours) || 12);
      setSessionCookie(res, session.token, { secure: config.production === true, maxAgeSeconds: (Number(config.sessionTtlHours) || 12) * 3600 });
    }
    res.status(201).json({ user: publicUser(user), memberships: await getMembershipContext(db, user) });
  }));

  app.get('/api/invitations', requireAuth, asyncRoute(async (req, res) => {
    const restaurantId = String(req.query.restaurantId ?? '');
    if (!isSuperAdmin(req.user) && !restaurantId) throw new HttpError(400, 'A restaurant context is required.', 'RESTAURANT_CONTEXT_REQUIRED');
    if (restaurantId) {
      const access = await authorizeRestaurant(db, req.user, restaurantId, PERMISSION.MENU_EDITOR_MANAGE);
      if (access.role !== 'SUPER_ADMIN' && !access.restaurant.menuEditorManagementEnabled) throw new HttpError(403, 'Menu Editor management is disabled for this restaurant.', 'PERMISSION_DENIED');
    } else await requireSuperAdmin(req.user);
    const page = clampPage(req.query.page), limit = clampLimit(req.query.limit);
    const filter = restaurantId ? { restaurantId } : {};
    const [rows, total] = await Promise.all([
      db.collection('invitations').find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
      db.collection('invitations').countDocuments(filter),
    ]);
    const data = await Promise.all(rows.map(async (invite) => {
      const restaurant = await db.collection('restaurants').findOne({ _id: invite.restaurantId });
      return { id: invite._id, email: invite.email, role: invite.role, restaurantId: invite.restaurantId, restaurantName: restaurant?.name ?? '(removed)', permissions: invite.permissions, expiresAt: invite.expiresAt, consumedAt: invite.consumedAt ?? null, revokedAt: invite.revokedAt ?? null, status: invite.consumedAt ? 'ACCEPTED' : invite.revokedAt ? 'REVOKED' : invite.expiresAt <= now() ? 'EXPIRED' : 'PENDING', createdAt: invite.createdAt };
    }));
    res.json(pageResult(data, total, page, limit));
  }));

  app.patch('/api/invitations/:invitationId/revoke', requireAuth, asyncRoute(async (req, res) => {
    const invitation = await db.collection('invitations').findOne({ _id: req.params.invitationId });
    if (!invitation) throw new HttpError(404, 'Invitation not found.', 'NOT_FOUND');
    if (!isSuperAdmin(req.user)) {
      if (invitation.role !== MEMBERSHIP_ROLE.MENU_EDITOR) throw new HttpError(403, 'Restaurant Admins may revoke Menu Editor invitations only.', 'FORBIDDEN');
      const access = await authorizeRestaurant(db, req.user, invitation.restaurantId, PERMISSION.MENU_EDITOR_MANAGE);
      if (access.role !== MEMBERSHIP_ROLE.RESTAURANT_ADMIN || !access.restaurant.menuEditorManagementEnabled) throw new HttpError(403, 'Menu Editor management is disabled for this restaurant.', 'PERMISSION_DENIED');
    }
    if (invitation.consumedAt || invitation.revokedAt || invitation.expiresAt <= now()) throw new HttpError(409, 'Only pending invitations can be revoked.', 'INVITATION_NOT_PENDING');
    const revokedAt = now();
    const revokeResult = await db.collection('invitations').updateOne({ _id: invitation._id, consumedAt: { $exists: false }, revokedAt: { $exists: false }, expiresAt: { $gt: revokedAt } }, { $set: { revokedAt } });
    if (!revokeResult.matchedCount) throw new HttpError(409, 'This invitation is no longer pending.', 'INVITATION_NOT_PENDING');
    await recordAudit(db, { actor: req.user, restaurantId: invitation.restaurantId, action: 'INVITATION_REVOKED', targetEntityType: 'invitation', targetEntityId: invitation._id, changes: { role: invitation.role }, requestId: req.requestId });
    res.json({ id: invitation._id, status: 'REVOKED' });
  }));

  app.post('/api/invitations', requireAuth, asyncRoute(async (req, res) => {
    const payload = parseBody(inviteSchema, req.body);
    const access = await authorizeRestaurant(db, req.user, payload.restaurantId, PERMISSION.MENU_EDITOR_MANAGE);
    if (!isSuperAdmin(req.user)) {
      if (access.role !== MEMBERSHIP_ROLE.RESTAURANT_ADMIN) throw new HttpError(403, 'Only a Restaurant Admin may invite Menu Editors.', 'FORBIDDEN');
      if (payload.role !== MEMBERSHIP_ROLE.MENU_EDITOR) throw new HttpError(403, 'Restaurant Admins may invite Menu Editors only.', 'FORBIDDEN');
      if (!access.restaurant.menuEditorManagementEnabled) throw new HttpError(403, 'Menu Editor management is disabled for this restaurant.', 'PERMISSION_DENIED');
    }
    const emailNormalized = normalizeEmail(payload.email);
    const existingUser = await db.collection('users').findOne({ emailNormalized });
    if (existingUser?.isActive === false) throw new HttpError(409, 'The invited account is suspended.', 'ACCOUNT_SUSPENDED');
    const existingMembership = existingUser ? await db.collection('memberships').findOne({ userId: existingUser._id, restaurantId: payload.restaurantId, isActive: true }) : null;
    if (existingMembership) throw new HttpError(409, 'This user already has an active membership for the restaurant.', 'MEMBERSHIP_EXISTS');
    const pending = await db.collection('invitations').findOne({ emailNormalized, restaurantId: payload.restaurantId, consumedAt: { $exists: false }, revokedAt: { $exists: false }, expiresAt: { $gt: now() } });
    if (pending) throw new HttpError(409, 'A pending invitation already exists for this email and restaurant.', 'INVITATION_EXISTS');

    const token = newOpaqueToken();
    const createdAt = now();
    const ttlHours = Number(config.invitationTtlHours) || 48;
    const role = payload.role;
    const permissions = role === MEMBERSHIP_ROLE.MENU_EDITOR
      ? (payload.permissions ?? ['menu.read', 'menu.create', 'menu.update'])
      : [];
    const invite = {
      _id: randomUUID(),
      email: payload.email.trim(),
      emailNormalized,
      role,
      restaurantId: payload.restaurantId,
      permissions,
      tokenHash: sha256(token),
      createdBy: req.user._id,
      createdAt,
      expiresAt: new Date(createdAt.getTime() + ttlHours * 3600 * 1000),
    };
    await db.collection('invitations').insertOne(invite);
    await recordAudit(db, { actor: req.user, restaurantId: payload.restaurantId, action: 'USER_INVITED', targetEntityType: 'invitation', targetEntityId: invite._id, changes: { role, permissions }, requestId: req.requestId });
    const baseUrl = config.publicBaseUrl || `${req.protocol}://${req.get('host')}`;
    const inviteUrl = `${baseUrl.replace(/\/$/, '')}/accept-invite.html#token=${token}`;
    res.status(201).json({ invitation: { id: invite._id, email: invite.email, role, restaurantId: invite.restaurantId, permissions, expiresAt: invite.expiresAt }, inviteUrl });
  }));

  app.get('/api/admin/overview', requireAuth, asyncRoute(async (req, res) => {
    if (isSuperAdmin(req.user)) {
      const [totalRestaurants, allRestaurants, totalUsers, users, recentRestaurants, recentActivity] = await Promise.all([
        db.collection('restaurants').countDocuments({}),
        db.collection('restaurants').countDocuments({ isActive: true }),
        db.collection('users').countDocuments({}),
        db.collection('users').find({ isActive: true }).toArray(),
        db.collection('restaurants').find({}).sort({ createdAt: -1 }).limit(5).toArray(),
        db.collection('auditEvents').find({}).sort({ createdAt: -1 }).limit(8).toArray(),
      ]);
      const activeUserIds = new Set(users.map((user) => user._id));
      const [adminMemberships, editorMemberships] = await Promise.all([
        db.collection('memberships').find({ role: MEMBERSHIP_ROLE.RESTAURANT_ADMIN, isActive: true }).toArray(),
        db.collection('memberships').find({ role: MEMBERSHIP_ROLE.MENU_EDITOR, isActive: true }).toArray(),
      ]);
      const activeAdmins = new Set(adminMemberships.filter((membership) => activeUserIds.has(membership.userId)).map((membership) => membership.userId)).size;
      const activeEditors = new Set(editorMemberships.filter((membership) => activeUserIds.has(membership.userId)).map((membership) => membership.userId)).size;
      res.json({ role: 'SUPER_ADMIN', stats: { totalRestaurants, activeRestaurants: allRestaurants, suspendedRestaurants: totalRestaurants - allRestaurants, totalUsers, activeUsers: users.length, activeRestaurantAdmins: activeAdmins, activeMenuEditors: activeEditors }, recentRestaurants: recentRestaurants.map(safeRestaurant), recentActivity: recentActivity.map(publicAuditEvent), health: { database: db.mode === 'memory' ? 'development-memory' : 'connected', uptimeSeconds: Math.floor(process.uptime()) } });
      return;
    }
    const restaurantId = String(req.query.restaurantId ?? '');
    if (!restaurantId) throw new HttpError(400, 'Select an authorized restaurant context.', 'RESTAURANT_CONTEXT_REQUIRED');
    const access = await authorizeRestaurant(db, req.user, restaurantId, PERMISSION.MENU_READ);
    const published = await db.collection('publishedMenus').findOne({ restaurantId });
    const lastPublished = published?.publishedAt ?? access.restaurant.publishedAt ?? null;
    const draftFilter = lastPublished ? { restaurantId, updatedAt: { $gt: new Date(lastPublished) } } : { restaurantId };
    const [itemCount, available, categories, recentActivity, recentItems, pendingItems, pendingCategories] = await Promise.all([
      db.collection('menuItems').countDocuments({ restaurantId }),
      db.collection('menuItems').countDocuments({ restaurantId, isAvailable: true }),
      db.collection('categories').find({ restaurantId, isActive: true }).sort({ sortOrder: 1 }).toArray(),
      db.collection('auditEvents').find({ restaurantId }).sort({ createdAt: -1 }).limit(8).toArray(),
      db.collection('menuItems').find({ restaurantId }).sort({ updatedAt: -1 }).limit(5).toArray(),
      db.collection('menuItems').countDocuments(draftFilter),
      db.collection('categories').countDocuments(draftFilter),
    ]);
    const pendingDrafts = pendingItems + pendingCategories;
    const canViewActivity = access.permissions.includes(PERMISSION.ACTIVITY_READ);
    res.json({
      role: access.role,
      restaurant: safeRestaurant(access.restaurant),
      stats: { totalMenuItems: itemCount, availableDishes: available, soldOutDishes: itemCount - available, activeCategories: categories.length, publishedVersion: published?.version ?? access.restaurant.menuVersion ?? 0, publishedAt: lastPublished, pendingDrafts }, 
      recentActivity: canViewActivity ? recentActivity.map(publicAuditEvent) : [],
      recentlyEditedItems: recentItems.map(publicMenuItem),
    });
  }));

  app.get('/api/restaurants', requireAuth, asyncRoute(async (req, res) => {
    const page = clampPage(req.query.page), limit = clampLimit(req.query.limit);
    const search = String(req.query.search ?? '');
    const status = String(req.query.status ?? '');
    let baseFilter = {};
    if (!isSuperAdmin(req.user)) {
      const memberships = await db.collection('memberships').find({ userId: req.user._id, isActive: true }).toArray();
      const ids = memberships.filter((membership) => ADMIN_ROLES.has(membership.role) && (membership.role === MEMBERSHIP_ROLE.RESTAURANT_ADMIN || permissionsForMembership(membership).includes(PERMISSION.MENU_READ))).map((membership) => membership.restaurantId);
      baseFilter = { _id: { $in: ids } };
    }
    const clauses = [baseFilter];
    if (search.trim()) clauses.push({ $or: [makeSearch('name', search), makeSearch('slug', search)].filter(Boolean) });
    if (status === 'active') clauses.push({ isActive: true });
    if (status === 'suspended') clauses.push({ isActive: false });
    const filter = clauses.length > 1 ? { $and: clauses } : baseFilter;
    const allowedSorts = new Set(['name', 'createdAt', 'updatedAt', 'menuVersion']);
    const sortField = allowedSorts.has(String(req.query.sort)) ? String(req.query.sort) : 'updatedAt';
    const sortDirection = req.query.direction === 'asc' ? 1 : -1;
    const [rows, total] = await Promise.all([
      db.collection('restaurants').find(filter).sort({ [sortField]: sortDirection }).skip((page - 1) * limit).limit(limit).toArray(),
      db.collection('restaurants').countDocuments(filter),
    ]);
    const enriched = await Promise.all(rows.map(async (restaurant) => {
      const [membership, menuItemCount, adminMembership] = await Promise.all([
        db.collection('memberships').findOne({ userId: req.user._id, restaurantId: restaurant._id, isActive: true }),
        db.collection('menuItems').countDocuments({ restaurantId: restaurant._id }),
        db.collection('memberships').findOne({ restaurantId: restaurant._id, role: MEMBERSHIP_ROLE.RESTAURANT_ADMIN, isActive: true }),
      ]);
      const adminUser = adminMembership ? await db.collection('users').findOne({ _id: adminMembership.userId, isActive: true }) : null;
      return safeRestaurant({ ...restaurant, membershipRole: membership?.role, menuItemCount, restaurantAdminName: adminUser?.name ?? '' });
    }));
    res.json(pageResult(enriched, total, page, limit));
  }));

  app.post('/api/restaurants', requireAuth, requireSuper, asyncRoute(async (req, res) => {
    const payload = parseBody(restaurantCreateSchema, req.body);
    const existing = await db.collection('restaurants').findOne({ slug: payload.slug });
    if (existing) throw new HttpError(409, 'That restaurant slug is already in use.', 'SLUG_EXISTS');
    const createdAt = now();
    const restaurant = { _id: randomUUID(), ...payload, isActive: true, menuVersion: 0, publishedAt: null, createdAt, updatedAt: createdAt };
    await db.collection('restaurants').insertOne(restaurant);
    await recordAudit(db, { actor: req.user, restaurantId: restaurant._id, action: 'RESTAURANT_CREATED', targetEntityType: 'restaurant', targetEntityId: restaurant._id, changes: { name: restaurant.name, slug: restaurant.slug }, requestId: req.requestId });
    res.status(201).json({ restaurant: safeRestaurant(restaurant) });
  }));

  app.get('/api/restaurants/:restaurantId', requireAuth, createRestaurantGuard(db, PERMISSION.MENU_READ), asyncRoute(async (req, res) => {
    res.json({ restaurant: safeRestaurant(req.restaurantAccess.restaurant) });
  }));

  app.get('/api/restaurants/:restaurantId/preview', requireAuth, createRestaurantGuard(db, PERMISSION.MENU_READ), asyncRoute(async (req, res) => {
    const restaurant = req.restaurantAccess.restaurant;
    const [categories, items, published] = await Promise.all([
      db.collection('categories').find({ restaurantId: restaurant._id, isActive: true }).sort({ sortOrder: 1 }).toArray(),
      db.collection('menuItems').find({ restaurantId: restaurant._id }).sort({ sortOrder: 1, name: 1 }).toArray(),
      db.collection('publishedMenus').findOne({ restaurantId: restaurant._id }),
    ]);
    res.setHeader('Cache-Control', 'no-store, private');
    res.json({ restaurant: { name: restaurant.name, description: restaurant.description ?? '', menuHeaderNote: restaurant.menuHeaderNote ?? '', menuAnnouncement: restaurant.menuAnnouncement ?? '', logoUrl: restaurant.logoUrl ?? '', coverImageUrl: restaurant.coverImageUrl ?? '', contact: restaurant.contact ?? {} }, version: published?.version ?? restaurant.menuVersion ?? 0, publishedAt: published?.publishedAt ?? null, categories: categories.map(publicCategory), items: items.map(publicMenuItem) });
  }));

  app.patch('/api/restaurants/:restaurantId', requireAuth, createRestaurantGuard(db, PERMISSION.RESTAURANT_UPDATE), asyncRoute(async (req, res) => {
    const payload = parseBody(restaurantUpdateSchema, req.body);
    if (!isSuperAdmin(req.user) && Object.hasOwn(payload, 'menuEditorManagementEnabled')) {
      throw new HttpError(403, 'Only Super Admin may change Menu Editor management settings.', 'FORBIDDEN');
    }
    const restaurant = req.restaurantAccess.restaurant;
    const updatedAt = now();
    await db.collection('restaurants').updateOne({ _id: restaurant._id }, { $set: { ...payload, updatedAt } });
    await recordAudit(db, { actor: req.user, restaurantId: restaurant._id, action: 'RESTAURANT_UPDATED', targetEntityType: 'restaurant', targetEntityId: restaurant._id, changes: { fields: Object.keys(payload) }, requestId: req.requestId });
    res.json({ restaurant: safeRestaurant({ ...restaurant, ...payload, updatedAt }) });
  }));

  app.patch('/api/restaurants/:restaurantId/status', requireAuth, requireSuper, asyncRoute(async (req, res) => {
    const payload = parseBody(restaurantStatusSchema, req.body);
    const restaurant = await db.collection('restaurants').findOne({ _id: req.params.restaurantId });
    if (!restaurant) throw new HttpError(404, 'Restaurant not found.', 'NOT_FOUND');
    const updatedAt = now();
    await db.collection('restaurants').updateOne({ _id: restaurant._id }, { $set: { isActive: payload.isActive, updatedAt, suspendedAt: payload.isActive ? null : updatedAt } });
    await db.collection('invitations').updateMany({ restaurantId: restaurant._id, consumedAt: { $exists: false }, revokedAt: { $exists: false } }, { $set: { revokedAt: updatedAt } });
    await recordAudit(db, { actor: req.user, restaurantId: restaurant._id, action: payload.isActive ? 'RESTAURANT_REACTIVATED' : 'RESTAURANT_SUSPENDED', targetEntityType: 'restaurant', targetEntityId: restaurant._id, changes: { isActive: payload.isActive }, requestId: req.requestId });
    res.json({ restaurant: safeRestaurant({ ...restaurant, isActive: payload.isActive, updatedAt }) });
  }));

  app.get('/api/users', requireAuth, requireSuper, asyncRoute(async (req, res) => {
    const page = clampPage(req.query.page), limit = clampLimit(req.query.limit);
    const search = String(req.query.search ?? '').trim();
    const role = String(req.query.role ?? '');
    const status = String(req.query.status ?? '');
    const clauses = [];
    if (search) clauses.push({ $or: [makeSearch('name', search), makeSearch('emailNormalized', normalizeEmail(search))].filter(Boolean) });
    if (status === 'active') clauses.push({ isActive: true });
    if (status === 'suspended') clauses.push({ isActive: false });
    if (role === 'SUPER_ADMIN') clauses.push({ globalRole: GLOBAL_ROLE.SUPER_ADMIN });
    else if (role === 'NONE') {
      const activeMemberships = await db.collection('memberships').find({ isActive: true }).toArray();
      clauses.push({ globalRole: { $ne: GLOBAL_ROLE.SUPER_ADMIN } });
      clauses.push({ _id: { $nin: [...new Set(activeMemberships.map((membership) => membership.userId))] } });
    } else if (role === 'RESTAURANT_ADMIN' || role === 'MENU_EDITOR') {
      const memberships = await db.collection('memberships').find({ role, isActive: true }).toArray();
      clauses.push({ _id: { $in: [...new Set(memberships.map((membership) => membership.userId))] } });
    }
    const filter = clauses.length > 1 ? { $and: clauses } : (clauses[0] || {});
    const allowedSorts = new Set(['name', 'createdAt', 'lastLoginAt']);
    const sortField = allowedSorts.has(String(req.query.sort)) ? String(req.query.sort) : 'createdAt';
    const sortDirection = req.query.direction === 'asc' ? 1 : -1;
    const [rows, total] = await Promise.all([
      db.collection('users').find(filter).sort({ [sortField]: sortDirection }).skip((page - 1) * limit).limit(limit).toArray(),
      db.collection('users').countDocuments(filter),
    ]);
    const data = await Promise.all(rows.map(async (user) => {
      const memberships = await db.collection('memberships').find({ userId: user._id }).toArray();
      const membershipDetails = [];
      for (const membership of memberships) {
        const restaurant = await db.collection('restaurants').findOne({ _id: membership.restaurantId });
        membershipDetails.push({ id: membership._id, restaurantId: membership.restaurantId, restaurantName: restaurant?.name ?? '(removed)', role: membership.role, permissions: permissionsForMembership(membership), isActive: membership.isActive });
      }
      return { ...publicUser(user), memberships: membershipDetails };
    }));
    res.json(pageResult(data, total, page, limit));
  }));

  app.get('/api/admin/export/restaurants.csv', requireAuth, requireSuper, asyncRoute(async (_req, res) => {
    const rows = await db.collection('restaurants').find({}).sort({ createdAt: -1 }).toArray();
    sendCsv(res, 'restaurants.csv', ['id', 'name', 'slug', 'status', 'menu_version', 'published_at', 'created_at', 'updated_at'], rows.map((restaurant) => [restaurant._id, restaurant.name, restaurant.slug, restaurant.isActive ? 'ACTIVE' : 'SUSPENDED', restaurant.menuVersion ?? 0, restaurant.publishedAt?.toISOString?.() ?? '', restaurant.createdAt?.toISOString?.() ?? '', restaurant.updatedAt?.toISOString?.() ?? '']));
  }));

  app.get('/api/admin/export/users.csv', requireAuth, requireSuper, asyncRoute(async (_req, res) => {
    const users = await db.collection('users').find({}).sort({ createdAt: -1 }).toArray();
    const rows = [];
    for (const user of users) {
      const memberships = await db.collection('memberships').find({ userId: user._id }).toArray();
      const descriptions = [];
      for (const membership of memberships) {
        const restaurant = await db.collection('restaurants').findOne({ _id: membership.restaurantId });
        descriptions.push(`${restaurant?.name ?? '(removed)'}:${membership.role}${membership.isActive ? '' : ':REVOKED'}`);
      }
      rows.push([user._id, user.name, user.email, isSuperAdmin(user) ? 'SUPER_ADMIN' : [...new Set(memberships.map((membership) => membership.role))].join('|'), user.isActive ? 'ACTIVE' : 'SUSPENDED', descriptions.join('; '), user.createdAt?.toISOString?.() ?? '', user.lastLoginAt?.toISOString?.() ?? '']);
    }
    sendCsv(res, 'users.csv', ['id', 'name', 'email', 'roles', 'status', 'restaurant_memberships', 'created_at', 'last_login_at'], rows);
  }));

  app.get('/api/users/:userId', requireAuth, requireSuper, asyncRoute(async (req, res) => {
    const user = await db.collection('users').findOne({ _id: req.params.userId });
    if (!user) throw new HttpError(404, 'User not found.', 'NOT_FOUND');
    const memberships = await db.collection('memberships').find({ userId: user._id }).toArray();
    const details = [];
    for (const membership of memberships) {
      const restaurant = await db.collection('restaurants').findOne({ _id: membership.restaurantId });
      details.push({ id: membership._id, restaurantId: membership.restaurantId, restaurantName: restaurant?.name ?? '(removed)', role: membership.role, permissions: permissionsForMembership(membership), isActive: membership.isActive });
    }
    res.json({ user: { ...publicUser(user), memberships: details } });
  }));

  app.patch('/api/users/:userId/status', requireAuth, requireSuper, asyncRoute(async (req, res) => {
    const payload = parseBody(userStatusSchema, req.body);
    const user = await db.collection('users').findOne({ _id: req.params.userId });
    if (!user) throw new HttpError(404, 'User not found.', 'NOT_FOUND');
    if (user._id === req.user._id && payload.isActive === false) throw new HttpError(400, 'You cannot suspend your own active account.', 'SELF_SUSPENSION_BLOCKED');
    const updatedAt = now();
    await db.collection('users').updateOne({ _id: user._id }, { $set: { isActive: payload.isActive, updatedAt, ...(payload.isActive ? {} : { suspendedAt: updatedAt }) } });
    if (!payload.isActive) {
      await db.collection('sessions').deleteMany({ userId: user._id });
      await db.collection('invitations').updateMany({ emailNormalized: user.emailNormalized, consumedAt: { $exists: false }, revokedAt: { $exists: false } }, { $set: { revokedAt: updatedAt } });
    }
    await recordAudit(db, { actor: req.user, action: payload.isActive ? 'USER_REACTIVATED' : 'USER_SUSPENDED', targetEntityType: 'user', targetEntityId: user._id, changes: { isActive: payload.isActive }, requestId: req.requestId });
    res.json({ user: publicUser({ ...user, isActive: payload.isActive, updatedAt }) });
  }));

  app.post('/api/users/:userId/revoke-sessions', requireAuth, requireSuper, asyncRoute(async (req, res) => {
    const user = await db.collection('users').findOne({ _id: req.params.userId });
    if (!user) throw new HttpError(404, 'User not found.', 'NOT_FOUND');
    const result = await db.collection('sessions').deleteMany({ userId: user._id });
    await recordAudit(db, { actor: req.user, action: 'USER_SESSIONS_REVOKED', targetEntityType: 'user', targetEntityId: user._id, changes: { revokedCount: result.deletedCount }, requestId: req.requestId });
    res.json({ revokedCount: result.deletedCount });
  }));

  app.get('/api/restaurants/:restaurantId/memberships', requireAuth, asyncRoute(async (req, res) => {
    const access = await authorizeRestaurant(db, req.user, req.params.restaurantId, PERMISSION.MENU_EDITOR_MANAGE);
    if (access.role !== 'SUPER_ADMIN' && !access.restaurant.menuEditorManagementEnabled) throw new HttpError(403, 'Menu Editor management is disabled for this restaurant.', 'PERMISSION_DENIED');
    const memberships = await db.collection('memberships').find({ restaurantId: req.params.restaurantId }).sort({ createdAt: -1 }).toArray();
    const users = [];
    for (const membership of memberships) {
      const user = await db.collection('users').findOne({ _id: membership.userId });
      if (!user) continue;
      users.push({ id: membership._id, user: publicUser(user), role: membership.role, permissions: permissionsForMembership(membership), isActive: membership.isActive, createdAt: membership.createdAt });
    }
    res.json({ data: users });
  }));

  app.post('/api/restaurants/:restaurantId/memberships', requireAuth, requireSuper, asyncRoute(async (req, res) => {
    const payload = parseBody(idSchema, req.body);
    const restaurant = await db.collection('restaurants').findOne({ _id: req.params.restaurantId });
    if (!restaurant) throw new HttpError(404, 'Restaurant not found.', 'NOT_FOUND');
    const user = await db.collection('users').findOne({ _id: payload.userId });
    if (!user || user.isActive !== true) throw new HttpError(404, 'Active user not found.', 'USER_NOT_FOUND');
    if (isSuperAdmin(user)) throw new HttpError(400, 'A Super Admin cannot be assigned through restaurant membership.', 'INVALID_MEMBERSHIP_ROLE');
    const existing = await db.collection('memberships').findOne({ userId: user._id, restaurantId: restaurant._id });
    const createdAt = now();
    const membership = { _id: existing?._id ?? randomUUID(), userId: user._id, restaurantId: restaurant._id, role: payload.role, permissions: payload.role === MEMBERSHIP_ROLE.MENU_EDITOR ? (payload.permissions ?? ['menu.read', 'menu.create', 'menu.update']) : [], isActive: true, createdAt: existing?.createdAt ?? createdAt, updatedAt: createdAt };
    if (existing) {
      const { _id: _membershipId, ...membershipFields } = membership;
      await db.collection('memberships').updateOne({ _id: existing._id }, { $set: membershipFields });
    } else await db.collection('memberships').insertOne(membership);
    await recordAudit(db, { actor: req.user, restaurantId: restaurant._id, action: existing ? 'MEMBERSHIP_UPDATED' : 'MEMBERSHIP_CREATED', targetEntityType: 'membership', targetEntityId: membership._id, changes: { role: membership.role, permissions: membership.permissions, isActive: true }, requestId: req.requestId });
    res.status(existing ? 200 : 201).json({ membership: { id: membership._id, userId: user._id, restaurantId: restaurant._id, role: membership.role, permissions: permissionsForMembership(membership), isActive: true } });
  }));

  app.patch('/api/restaurants/:restaurantId/memberships/:membershipId', requireAuth, asyncRoute(async (req, res) => {
    const payload = parseBody(membershipUpdateSchema, req.body);
    const access = await authorizeRestaurant(db, req.user, req.params.restaurantId, PERMISSION.MENU_EDITOR_MANAGE);
    if (access.role !== 'SUPER_ADMIN' && !access.restaurant.menuEditorManagementEnabled) throw new HttpError(403, 'Menu Editor management is disabled for this restaurant.', 'PERMISSION_DENIED');
    const membership = await db.collection('memberships').findOne({ _id: req.params.membershipId, restaurantId: req.params.restaurantId });
    if (!membership) throw new HttpError(404, 'Membership not found.', 'NOT_FOUND');
    if (access.role !== 'SUPER_ADMIN' && membership.role !== MEMBERSHIP_ROLE.MENU_EDITOR) throw new HttpError(403, 'Restaurant Admins may manage Menu Editors only.', 'FORBIDDEN');
    const memberUser = await db.collection('users').findOne({ _id: membership.userId });
    if (!memberUser || isSuperAdmin(memberUser)) throw new HttpError(403, 'This membership cannot be modified here.', 'FORBIDDEN');
    if (payload.role && access.role !== 'SUPER_ADMIN') throw new HttpError(403, 'Only Super Admin may change membership roles.', 'FORBIDDEN');
    const nextRole = payload.role ?? membership.role;
    const patch = { updatedAt: now() };
    if (payload.isActive !== undefined) patch.isActive = payload.isActive;
    if (nextRole) patch.role = nextRole;
    if (nextRole === MEMBERSHIP_ROLE.MENU_EDITOR && payload.permissions !== undefined) patch.permissions = payload.permissions;
    else if (nextRole === MEMBERSHIP_ROLE.MENU_EDITOR && membership.role !== nextRole) patch.permissions = [];
    if (nextRole === MEMBERSHIP_ROLE.RESTAURANT_ADMIN) patch.permissions = [];
    await db.collection('memberships').updateOne({ _id: membership._id }, { $set: patch });
    await recordAudit(db, { actor: req.user, restaurantId: membership.restaurantId, action: 'MEMBERSHIP_UPDATED', targetEntityType: 'membership', targetEntityId: membership._id, changes: { role: patch.role ?? membership.role, permissionsChanged: payload.permissions !== undefined, isActive: patch.isActive ?? membership.isActive }, requestId: req.requestId });
    res.json({ membership: { id: membership._id, userId: membership.userId, restaurantId: membership.restaurantId, role: patch.role ?? membership.role, permissions: nextRole === MEMBERSHIP_ROLE.MENU_EDITOR ? (patch.permissions ?? permissionsForMembership(membership)) : [], isActive: patch.isActive ?? membership.isActive } });
  }));

  app.delete('/api/restaurants/:restaurantId/memberships/:membershipId', requireAuth, asyncRoute(async (req, res) => {
    const access = await authorizeRestaurant(db, req.user, req.params.restaurantId, PERMISSION.MENU_EDITOR_MANAGE);
    if (access.role !== 'SUPER_ADMIN' && !access.restaurant.menuEditorManagementEnabled) throw new HttpError(403, 'Menu Editor management is disabled for this restaurant.', 'PERMISSION_DENIED');
    const membership = await db.collection('memberships').findOne({ _id: req.params.membershipId, restaurantId: req.params.restaurantId });
    if (!membership) throw new HttpError(404, 'Membership not found.', 'NOT_FOUND');
    if (access.role !== 'SUPER_ADMIN' && membership.role !== MEMBERSHIP_ROLE.MENU_EDITOR) throw new HttpError(403, 'Restaurant Admins may revoke Menu Editor memberships only.', 'FORBIDDEN');
    await db.collection('memberships').updateOne({ _id: membership._id }, { $set: { isActive: false, updatedAt: now(), revokedAt: now() } });
    await recordAudit(db, { actor: req.user, restaurantId: membership.restaurantId, action: 'MEMBERSHIP_REVOKED', targetEntityType: 'membership', targetEntityId: membership._id, changes: { role: membership.role }, requestId: req.requestId });
    res.status(204).end();
  }));

  app.get('/api/restaurants/:restaurantId/categories', requireAuth, createRestaurantGuard(db, PERMISSION.MENU_READ), asyncRoute(async (req, res) => {
    const rows = await db.collection('categories').find({ restaurantId: req.params.restaurantId }).sort({ sortOrder: 1, name: 1 }).toArray();
    res.json({ data: rows.map(publicCategory) });
  }));
  app.post('/api/restaurants/:restaurantId/categories', requireAuth, createRestaurantGuard(db, PERMISSION.CATEGORY_MANAGE), asyncRoute(async (req, res) => {
    const payload = parseBody(categorySchema, req.body);
    const createdAt = now();
    const category = { _id: randomUUID(), restaurantId: req.params.restaurantId, ...payload, createdAt, updatedAt: createdAt };
    await db.collection('categories').insertOne(category);
    await recordAudit(db, { actor: req.user, restaurantId: category.restaurantId, action: 'CATEGORY_CREATED', targetEntityType: 'category', targetEntityId: category._id, changes: { name: category.name }, requestId: req.requestId });
    res.status(201).json({ category: publicCategory(category) });
  }));
  app.patch('/api/restaurants/:restaurantId/categories/:categoryId', requireAuth, createRestaurantGuard(db, PERMISSION.CATEGORY_MANAGE), asyncRoute(async (req, res) => {
    const payload = parseBody(categoryUpdateSchema, req.body);
    const category = await db.collection('categories').findOne({ _id: req.params.categoryId, restaurantId: req.params.restaurantId });
    if (!category) throw new HttpError(404, 'Category not found.', 'NOT_FOUND');
    const updatedAt = now();
    await db.collection('categories').updateOne({ _id: category._id }, { $set: { ...payload, updatedAt } });
    await recordAudit(db, { actor: req.user, restaurantId: category.restaurantId, action: 'CATEGORY_UPDATED', targetEntityType: 'category', targetEntityId: category._id, changes: { fields: Object.keys(payload) }, requestId: req.requestId });
    res.json({ category: publicCategory({ ...category, ...payload, updatedAt }) });
  }));
  app.delete('/api/restaurants/:restaurantId/categories/:categoryId', requireAuth, createRestaurantGuard(db, PERMISSION.CATEGORY_MANAGE), asyncRoute(async (req, res) => {
    const category = await db.collection('categories').findOne({ _id: req.params.categoryId, restaurantId: req.params.restaurantId });
    if (!category) throw new HttpError(404, 'Category not found.', 'NOT_FOUND');
    await db.collection('categories').deleteOne({ _id: category._id });
    await db.collection('menuItems').updateMany({ restaurantId: category.restaurantId, categoryId: category._id }, { $set: { categoryId: '', updatedAt: now() } });
    await recordAudit(db, { actor: req.user, restaurantId: category.restaurantId, action: 'CATEGORY_DELETED', targetEntityType: 'category', targetEntityId: category._id, changes: { name: category.name }, requestId: req.requestId });
    res.status(204).end();
  }));

  app.get('/api/restaurants/:restaurantId/menu-items', requireAuth, createRestaurantGuard(db, PERMISSION.MENU_READ), asyncRoute(async (req, res) => {
    const page = clampPage(req.query.page), limit = clampLimit(req.query.limit);
    const search = String(req.query.search ?? '').trim();
    const clauses = [{ restaurantId: req.params.restaurantId }];
    if (search) clauses.push({ $or: [makeSearch('name', search), makeSearch('description', search)].filter(Boolean) });
    if (req.query.categoryId) clauses.push({ categoryId: String(req.query.categoryId) });
    if (req.query.availability === 'available') clauses.push({ isAvailable: true });
    if (req.query.availability === 'sold-out') clauses.push({ isAvailable: false });
    const filter = clauses.length > 1 ? { $and: clauses } : clauses[0];
    const [rows, total] = await Promise.all([
      db.collection('menuItems').find(filter).sort({ sortOrder: 1, updatedAt: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
      db.collection('menuItems').countDocuments(filter),
    ]);
    res.json(pageResult(rows.map(adminMenuItem), total, page, limit));
  }));
  app.post('/api/restaurants/:restaurantId/menu-items', requireAuth, createRestaurantGuard(db, PERMISSION.MENU_CREATE), asyncRoute(async (req, res) => {
    const payload = parseBody(menuItemSchema, req.body);
    await assertCategoryBelongs(db, payload.categoryId, req.params.restaurantId);
    const createdAt = now();
    const item = { _id: randomUUID(), restaurantId: req.params.restaurantId, ...payload, createdBy: req.user._id, createdAt, updatedAt: createdAt };
    await db.collection('menuItems').insertOne(item);
    await recordAudit(db, { actor: req.user, restaurantId: item.restaurantId, action: 'MENU_ITEM_CREATED', targetEntityType: 'menuItem', targetEntityId: item._id, changes: { name: item.name, price: item.price, isAvailable: item.isAvailable }, requestId: req.requestId });
    res.status(201).json({ item: adminMenuItem(item) });
  }));
  app.patch('/api/restaurants/:restaurantId/menu-items/:itemId', requireAuth, createRestaurantGuard(db, PERMISSION.MENU_UPDATE), asyncRoute(async (req, res) => {
    const payload = parseBody(menuItemUpdateSchema, req.body);
    const item = await db.collection('menuItems').findOne({ _id: req.params.itemId, restaurantId: req.params.restaurantId });
    if (!item) throw new HttpError(404, 'Menu item not found.', 'NOT_FOUND');
    if (Object.hasOwn(payload, 'categoryId')) await assertCategoryBelongs(db, payload.categoryId, req.params.restaurantId);
    const updatedAt = now();
    await db.collection('menuItems').updateOne({ _id: item._id, restaurantId: item.restaurantId }, { $set: { ...payload, updatedAt } });
    if (payload.price !== undefined && payload.price !== item.price) {
      await recordAudit(db, { actor: req.user, restaurantId: item.restaurantId, action: 'MENU_PRICE_CHANGED', targetEntityType: 'menuItem', targetEntityId: item._id, changes: { from: item.price, to: payload.price }, requestId: req.requestId });
    }
    if (payload.isAvailable !== undefined && payload.isAvailable !== item.isAvailable) {
      await recordAudit(db, { actor: req.user, restaurantId: item.restaurantId, action: 'MENU_AVAILABILITY_CHANGED', targetEntityType: 'menuItem', targetEntityId: item._id, changes: { isAvailable: payload.isAvailable }, requestId: req.requestId });
    }
    await recordAudit(db, { actor: req.user, restaurantId: item.restaurantId, action: 'MENU_ITEM_UPDATED', targetEntityType: 'menuItem', targetEntityId: item._id, changes: { fields: Object.keys(payload) }, requestId: req.requestId });
    res.json({ item: adminMenuItem({ ...item, ...payload, updatedAt }) });
  }));
  app.delete('/api/restaurants/:restaurantId/menu-items/:itemId', requireAuth, createRestaurantGuard(db, PERMISSION.MENU_DELETE), asyncRoute(async (req, res) => {
    const item = await db.collection('menuItems').findOne({ _id: req.params.itemId, restaurantId: req.params.restaurantId });
    if (!item) throw new HttpError(404, 'Menu item not found.', 'NOT_FOUND');
    await db.collection('menuItems').deleteOne({ _id: item._id, restaurantId: item.restaurantId });
    await recordAudit(db, { actor: req.user, restaurantId: item.restaurantId, action: 'MENU_ITEM_DELETED', targetEntityType: 'menuItem', targetEntityId: item._id, changes: { name: item.name }, requestId: req.requestId });
    res.status(204).end();
  }));

  app.post('/api/restaurants/:restaurantId/uploads', requireAuth, asyncRoute(async (req, _res, next) => {
    try { req.restaurantAccess = await authorizeRestaurant(db, req.user, req.params.restaurantId, PERMISSION.MENU_UPDATE); }
    catch { req.restaurantAccess = await authorizeRestaurant(db, req.user, req.params.restaurantId, PERMISSION.MENU_CREATE); }
    next();
  }), imageUpload, asyncRoute(async (req, res) => {
    if (!req.file) throw new HttpError(400, 'Select an image to upload.', 'FILE_REQUIRED');
    const { buffer, mimetype } = req.file;
    let extension;
    if (mimetype === 'image/jpeg' && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) extension = 'jpg';
    else if (mimetype === 'image/png' && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) extension = 'png';
    else if (mimetype === 'image/webp' && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') extension = 'webp';
    else throw new HttpError(415, 'Image contents do not match the declared file type.', 'INVALID_IMAGE');
    await mkdir(UPLOAD_DIR, { recursive: true });
    const filename = `${randomUUID()}.${extension}`;
    await writeFile(path.join(UPLOAD_DIR, filename), buffer, { flag: 'wx' });
    await recordAudit(db, { actor: req.user, restaurantId: req.params.restaurantId, action: 'IMAGE_UPLOADED', targetEntityType: 'asset', targetEntityId: filename, changes: { contentType: mimetype, sizeBytes: buffer.length }, requestId: req.requestId });
    res.status(201).json({ imageUrl: `/uploads/${filename}` });
  }));

  app.post('/api/restaurants/:restaurantId/publish', requireAuth, createRestaurantGuard(db, PERMISSION.MENU_PUBLISH), asyncRoute(async (req, res) => {
    const restaurant = req.restaurantAccess.restaurant;
    if (restaurant.isActive !== true) throw new HttpError(403, 'Suspended restaurants cannot publish menu updates.', 'RESTAURANT_SUSPENDED');
    const categories = await db.collection('categories').find({ restaurantId: restaurant._id, isActive: true }).sort({ sortOrder: 1 }).toArray();
    const items = await db.collection('menuItems').find({ restaurantId: restaurant._id }).sort({ sortOrder: 1, name: 1 }).toArray();
    const publishedAt = now();
    // Compare-and-set the version so simultaneous publishes cannot reuse a version number.
    let version;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const latest = await db.collection('restaurants').findOne({ _id: restaurant._id });
      const previousVersion = Number(latest.menuVersion) || 0;
      const condition = Object.hasOwn(latest, 'menuVersion') ? { menuVersion: previousVersion } : { menuVersion: { $exists: false } };
      const result = await db.collection('restaurants').updateOne({ _id: restaurant._id, ...condition }, { $set: { menuVersion: previousVersion + 1, publishedAt, updatedAt: publishedAt } });
      if (result.matchedCount) { version = previousVersion + 1; break; }
    }
    if (!version) throw new HttpError(409, 'Menu changed during publication. Please retry.', 'PUBLISH_CONFLICT');
    const publicSnapshot = {
      restaurantId: restaurant._id,
      slug: restaurant.slug,
      restaurant: { name: restaurant.name, description: restaurant.description ?? '', menuHeaderNote: restaurant.menuHeaderNote ?? '', menuAnnouncement: restaurant.menuAnnouncement ?? '', logoUrl: restaurant.logoUrl ?? '', coverImageUrl: restaurant.coverImageUrl ?? '', contact: restaurant.contact ?? {} },
      version,
      publishedAt,
      categories: categories.map(publicCategory),
      items: items.map(publicMenuItem),
    };
    await db.collection('publishedMenus').updateOne({ restaurantId: restaurant._id }, { $set: { ...publicSnapshot }, $setOnInsert: { _id: restaurant._id } }, { upsert: true });
    await recordAudit(db, { actor: req.user, restaurantId: restaurant._id, action: 'MENU_PUBLISHED', targetEntityType: 'publishedMenu', targetEntityId: restaurant._id, changes: { version, itemCount: items.length, categoryCount: categories.length }, requestId: req.requestId });
    res.json({ version, publishedAt, itemCount: items.length, categoryCount: categories.length });
  }));

  app.get('/api/restaurants/:restaurantId/qr', requireAuth, createRestaurantGuard(db, PERMISSION.QR_MANAGE), asyncRoute(async (req, res) => {
    const restaurant = req.restaurantAccess.restaurant;
    const baseUrl = config.publicBaseUrl || `${req.protocol}://${req.get('host')}`;
    const publicUrl = `${baseUrl.replace(/\/$/, '')}/menu.html?slug=${encodeURIComponent(restaurant.slug)}`;
    const dataUrl = await QRCode.toDataURL(publicUrl, { errorCorrectionLevel: 'M', margin: 2, width: 512, color: { dark: '#18231f', light: '#ffffff' } });
    res.json({ publicUrl, qrDataUrl: dataUrl, restaurantName: restaurant.name, slug: restaurant.slug });
  }));

  app.get('/api/public/menus/:slug', asyncRoute(async (req, res) => {
    const restaurant = await db.collection('restaurants').findOne({ slug: req.params.slug });
    if (!restaurant) {
      const demoSnapshot = getPublicDemoMenu(req.params.slug);
      if (demoSnapshot) {
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        return res.json(publicMenuSnapshot(demoSnapshot));
      }
      throw new HttpError(404, 'This restaurant menu is currently unavailable.', 'MENU_UNAVAILABLE');
    }
    if (restaurant.isActive !== true) throw new HttpError(404, 'This restaurant menu is currently unavailable.', 'MENU_UNAVAILABLE');
    const snapshot = await db.collection('publishedMenus').findOne({ restaurantId: restaurant._id });
    if (!snapshot) throw new HttpError(404, 'This restaurant has not published a menu yet.', 'MENU_NOT_PUBLISHED');
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    res.json(publicMenuSnapshot(snapshot));
  }));

  app.get('/api/audit-events', requireAuth, asyncRoute(async (req, res) => {
    const page = clampPage(req.query.page), limit = clampLimit(req.query.limit);
    const restaurantId = String(req.query.restaurantId ?? '');
    if (!isSuperAdmin(req.user)) {
      if (!restaurantId) throw new HttpError(400, 'A restaurant context is required.', 'RESTAURANT_CONTEXT_REQUIRED');
      await authorizeRestaurant(db, req.user, restaurantId, PERMISSION.ACTIVITY_READ);
    }
    const filter = {};
    if (restaurantId) filter.restaurantId = restaurantId;
    if (req.query.actorUserId) filter.actorUserId = String(req.query.actorUserId);
    if (req.query.action) filter.action = String(req.query.action).slice(0, 80);
    if (req.query.targetEntityType) filter.targetEntityType = String(req.query.targetEntityType).slice(0, 80);
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      const from = req.query.from ? new Date(String(req.query.from)) : null;
      const to = req.query.to ? new Date(String(req.query.to)) : null;
      if (from && !Number.isNaN(from.getTime())) filter.createdAt.$gte = from;
      if (to && !Number.isNaN(to.getTime())) filter.createdAt.$lte = to;
    }
    const [rows, total] = await Promise.all([
      db.collection('auditEvents').find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
      db.collection('auditEvents').countDocuments(filter),
    ]);
    res.json(pageResult(rows.map(publicAuditEvent), total, page, limit));
  }));

  app.get('/api/platform/settings', requireAuth, requireSuper, asyncRoute(async (_req, res) => {
    const settings = await db.collection('platformSettings').findOne({ _id: 'platform' }) ?? { supportEmail: '', defaultCurrency: 'PHP', timezone: 'Asia/Manila' };
    res.json({ settings: { supportEmail: settings.supportEmail, defaultCurrency: settings.defaultCurrency, timezone: settings.timezone, updatedAt: settings.updatedAt ?? null } });
  }));
  app.put('/api/platform/settings', requireAuth, requireSuper, asyncRoute(async (req, res) => {
    const payload = parseBody(settingsSchema, req.body);
    const updatedAt = now();
    await db.collection('platformSettings').updateOne({ _id: 'platform' }, { $set: { ...payload, updatedAt }, $setOnInsert: { _id: 'platform', createdAt: updatedAt } }, { upsert: true });
    await recordAudit(db, { actor: req.user, action: 'PLATFORM_SETTINGS_UPDATED', targetEntityType: 'platformSettings', targetEntityId: 'platform', changes: { fields: Object.keys(payload) }, requestId: req.requestId });
    res.json({ settings: { ...payload, updatedAt } });
  }));

  app.get('/api/admin/health', requireAuth, requireSuper, asyncRoute(async (_req, res) => {
    res.json({ database: db.mode === 'memory' ? 'development-memory' : 'connected', uptimeSeconds: Math.floor(process.uptime()), checkedAt: now() });
  }));

  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'API route not found.', 'NOT_FOUND')));
  app.use(apiErrorHandler);
  app.use((error, _req, res, _next) => {
    if (res.headersSent) return;
    res.status(error.status || 404).send('Not found');
  });
  return app;
}

function publicCategory(category) {
  return { id: category._id ?? category.id, name: category.name, description: category.description ?? '', sortOrder: category.sortOrder ?? 0, isActive: category.isActive !== false };
}

function publicMenuItem(item) {
  return { id: item._id ?? item.id, categoryId: item.categoryId ?? '', name: item.name, description: item.description ?? '', price: item.price, currency: item.currency ?? 'PHP', imageUrl: item.imageUrl ?? '', dietaryLabels: item.dietaryLabels ?? [], sortOrder: item.sortOrder ?? 0, isAvailable: item.isAvailable === true, createdAt: item.createdAt ?? null, updatedAt: item.updatedAt ?? null };
}

function publicMenuRestaurant(restaurant = {}) {
  const contact = restaurant.contact && typeof restaurant.contact === 'object' ? restaurant.contact : {};
  return {
    name: restaurant.name ?? '',
    description: restaurant.description ?? '',
    menuHeaderNote: restaurant.menuHeaderNote ?? '',
    menuAnnouncement: restaurant.menuAnnouncement ?? '',
    logoUrl: restaurant.logoUrl ?? '',
    coverImageUrl: restaurant.coverImageUrl ?? '',
    contact: {
      ...(contact.address ? { address: contact.address } : {}),
      ...(contact.phone ? { phone: contact.phone } : {}),
      ...(contact.email ? { email: contact.email } : {}),
      ...(contact.website ? { website: contact.website } : {}),
    },
  };
}

function publicMenuSnapshot(snapshot) {
  return {
    slug: snapshot.slug ?? '',
    restaurant: publicMenuRestaurant(snapshot.restaurant),
    version: Number.isFinite(snapshot.version) ? snapshot.version : 0,
    publishedAt: snapshot.publishedAt ?? null,
    categories: Array.isArray(snapshot.categories) ? snapshot.categories.map(publicCategory) : [],
    items: Array.isArray(snapshot.items) ? snapshot.items.map(publicMenuItem) : [],
  };
}

function adminMenuItem(item) {
  const result = publicMenuItem(item);
  if (Number.isFinite(item.foodCostPercent)) result.foodCostPercent = item.foodCostPercent;
  return result;
}

async function assertCategoryBelongs(db, categoryId, restaurantId) {
  if (!categoryId) return;
  const category = await db.collection('categories').findOne({ _id: categoryId, restaurantId, isActive: true });
  if (!category) throw new HttpError(400, 'Select an active category belonging to this restaurant.', 'INVALID_CATEGORY');
}
