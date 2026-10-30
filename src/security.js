import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { HttpError } from './errors.js';

const scrypt = promisify(scryptCallback);
export const SESSION_COOKIE = 'qr_session';

export const normalizeEmail = (email) => String(email ?? '').trim().toLowerCase();
export const sha256 = (value) => createHash('sha256').update(value).digest('hex');
export const newOpaqueToken = (bytes = 32) => randomBytes(bytes).toString('base64url');

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$16384$8$1$${salt.toString('base64url')}$${Buffer.from(derived).toString('base64url')}`;
}

export async function verifyPassword(password, encoded) {
  if (typeof encoded !== 'string') return false;
  const parts = encoded.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, nText, rText, pText, saltText, keyText] = parts;
  const N = Number(nText), r = Number(rText), p = Number(pText);
  if (N !== 16384 || r !== 8 || p !== 1) return false;
  try {
    const expected = Buffer.from(keyText, 'base64url');
    const actual = Buffer.from(await scrypt(password, Buffer.from(saltText, 'base64url'), expected.length, { N, r, p, maxmem: 64 * 1024 * 1024 }));
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function readCookie(req, name) {
  const cookieHeader = req.headers.cookie ?? '';
  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === name) {
      try { return decodeURIComponent(part.slice(separator + 1).trim()); } catch { return null; }
    }
  }
  return null;
}

export function setSessionCookie(res, token, { secure, maxAgeSeconds }) {
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${Math.max(0, maxAgeSeconds)}`,
  ];
  if (secure) parts.push('Secure');
  res.append('Set-Cookie', parts.join('; '));
}

export function clearSessionCookie(res, { secure }) {
  const parts = [`${SESSION_COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Strict', 'Max-Age=0'];
  if (secure) parts.push('Secure');
  res.append('Set-Cookie', parts.join('; '));
}

export async function createSession(db, userId, ttlHours = 12) {
  const token = newOpaqueToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);
  await db.collection('sessions').insertOne({
    _id: newOpaqueToken(18),
    userId,
    tokenHash: sha256(token),
    createdAt: now,
    expiresAt,
  });
  return { token, expiresAt };
}

export async function getSessionUser(db, req) {
  const token = readCookie(req, SESSION_COOKIE);
  if (!token || token.length > 256) return null;
  const sessions = db.collection('sessions');
  const session = await sessions.findOne({ tokenHash: sha256(token) });
  if (!session) return null;
  if (!(session.expiresAt instanceof Date) || session.expiresAt <= new Date()) {
    await sessions.deleteOne({ _id: session._id });
    return null;
  }
  const user = await db.collection('users').findOne({ _id: session.userId });
  if (!user || user.isActive !== true) {
    await sessions.deleteOne({ _id: session._id });
    return null;
  }
  return { ...user, _sessionId: session._id };
}

export async function revokeCurrentSession(db, req) {
  const token = readCookie(req, SESSION_COOKIE);
  if (!token) return;
  await db.collection('sessions').deleteOne({ tokenHash: sha256(token) });
}

export function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    globalRole: user.globalRole ?? null,
    isActive: user.isActive,
    emailVerifiedAt: user.emailVerifiedAt ?? null,
    lastLoginAt: user.lastLoginAt ?? null,
    createdAt: user.createdAt,
  };
}

export function assertValidPassword(password) {
  if (typeof password !== 'string' || password.length < 14 || password.length > 128) {
    throw new HttpError(400, 'Password must be between 14 and 128 characters.', 'INVALID_PASSWORD');
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    throw new HttpError(400, 'Password must include lowercase, uppercase, numeric, and symbol characters.', 'INVALID_PASSWORD');
  }
}
