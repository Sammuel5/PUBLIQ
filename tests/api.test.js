import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createApp } from '../src/app.js';
import { createMemoryDb } from '../src/store.js';
import { hashPassword, normalizeEmail } from '../src/security.js';
import { PUBLIQ_INTERNAL_FOOD_COST_NOTES } from '../src/demo-menus.js';

const STRONG_PASSWORD = 'StrongPassword!2026';
let db, server, baseUrl, ids, cookies;

async function jsonRequest(path, { method = 'GET', cookie, body, origin = baseUrl } = {}) {
  const headers = {};
  if (origin) headers.Origin = origin;
  if (cookie) headers.Cookie = cookie;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const contentType = response.headers.get('content-type') || '';
  const data = response.status === 204 ? null : contentType.includes('application/json') ? await response.json().catch(() => null) : await response.text();
  return { response, data };
}

async function login(email, password = STRONG_PASSWORD) {
  const { response, data } = await jsonRequest('/api/auth/login', { method: 'POST', body: { email, password } });
  assert.equal(response.status, 200, JSON.stringify(data));
  const setCookie = response.headers.get('set-cookie');
  assert.ok(setCookie?.includes('HttpOnly'));
  assert.ok(setCookie?.includes('SameSite=Strict'));
  return setCookie.split(';')[0];
}

beforeEach(async () => {
  db = createMemoryDb();
  const passwordHash = await hashPassword(STRONG_PASSWORD);
  const createdAt = new Date(Date.now() - 60_000);
  ids = {
    superAdmin: randomUUID(), admin: randomUUID(), editor: randomUUID(), editorNoPublish: randomUUID(),
    restaurantA: randomUUID(), restaurantB: randomUUID(), itemA: randomUUID(), itemB: randomUUID(), categoryA: randomUUID(),
  };
  const accounts = [
    { _id: ids.superAdmin, name: 'Platform Owner', email: 'super@example.test', globalRole: 'SUPER_ADMIN' },
    { _id: ids.admin, name: 'Restaurant Admin', email: 'admin@example.test', globalRole: null },
    { _id: ids.editor, name: 'Menu Editor', email: 'editor@example.test', globalRole: null },
    { _id: ids.editorNoPublish, name: 'Limited Editor', email: 'limited@example.test', globalRole: null },
  ];
  for (const account of accounts) {
    await db.collection('users').insertOne({ ...account, emailNormalized: normalizeEmail(account.email), passwordHash, isActive: true, emailVerifiedAt: createdAt, lastLoginAt: null, createdAt, updatedAt: createdAt });
  }
  const restaurants = [
    { _id: ids.restaurantA, name: 'Restaurant A', slug: 'restaurant-a', description: '', contact: {}, logoUrl: '', coverImageUrl: '', menuEditorManagementEnabled: true, isActive: true, menuVersion: 0, publishedAt: null, createdAt, updatedAt: createdAt },
    { _id: ids.restaurantB, name: 'Restaurant B', slug: 'restaurant-b', description: '', contact: {}, menuEditorManagementEnabled: false, isActive: true, menuVersion: 0, publishedAt: null, createdAt, updatedAt: createdAt },
  ];
  for (const restaurant of restaurants) await db.collection('restaurants').insertOne(restaurant);
  const memberships = [
    { _id: randomUUID(), userId: ids.admin, restaurantId: ids.restaurantA, role: 'RESTAURANT_ADMIN', permissions: [], isActive: true, createdAt, updatedAt: createdAt },
    { _id: randomUUID(), userId: ids.editor, restaurantId: ids.restaurantA, role: 'MENU_EDITOR', permissions: ['menu.read', 'menu.create', 'menu.update'], isActive: true, createdAt, updatedAt: createdAt },
    { _id: randomUUID(), userId: ids.editorNoPublish, restaurantId: ids.restaurantA, role: 'MENU_EDITOR', permissions: ['menu.read', 'menu.update', 'menu.publish'], isActive: true, createdAt, updatedAt: createdAt },
  ];
  for (const membership of memberships) await db.collection('memberships').insertOne(membership);
  await db.collection('categories').insertOne({ _id: ids.categoryA, restaurantId: ids.restaurantA, name: 'Mains', description: '', sortOrder: 0, isActive: true, createdAt, updatedAt: createdAt });
  await db.collection('menuItems').insertOne({ _id: ids.itemA, restaurantId: ids.restaurantA, categoryId: ids.categoryA, name: 'Test menu item', description: '', price: 275, currency: 'PHP', imageUrl: '', dietaryLabels: ['Vegetarian'], foodCostPercent: 35, sortOrder: 0, isAvailable: true, createdAt, updatedAt: createdAt });
  await db.collection('menuItems').insertOne({ _id: ids.itemB, restaurantId: ids.restaurantB, categoryId: '', name: 'Restaurant B test item', description: '', price: 100, currency: 'PHP', imageUrl: '', dietaryLabels: [], sortOrder: 0, isAvailable: true, createdAt, updatedAt: createdAt });

  const app = createApp({ db, config: { production: false, publicBaseUrl: '', sessionTtlHours: 12, invitationTtlHours: 48, uploadMaxMb: 5 } });
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  cookies = {
    super: await login('super@example.test'),
    admin: await login('admin@example.test'),
    editor: await login('editor@example.test'),
    limited: await login('limited@example.test'),
  };
});

afterEach(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
});

test('PUBLIQ public menu is visible without an admin and yields to the editable database menu', async () => {
  const { response, data } = await jsonRequest('/api/public/menus/publiq-superclub');
  assert.equal(response.status, 200, JSON.stringify(data));
  assert.equal(data.slug, 'publiq-superclub');
  assert.equal(data.restaurant.name, 'PUBLIQ Super Club');
  assert.equal(data.restaurant.logoUrl, '/assets/publiq-superclub-logo.jpg');
  assert.match(data.restaurant.menuAnnouncement, /12% VAT/);
  assert.match(data.restaurant.menuAnnouncement, /No additional service charge/);
  assert.equal(data.categories.length, 6);
  assert.equal(data.items.length, 56);
  assert.equal(data.items.find((item) => item.name === 'Mozzarella Stick').price, 359);
  assert.equal(data.items.find((item) => item.name === 'Bulalo Steak').price, 1110);
  assert.equal(data.items.find((item) => item.name === 'White Chocolate Chip Cream Frappuccino').price, 190);
  assert.ok(data.items.every((item) => !Object.hasOwn(item, 'foodCostPercent')));
  assert.equal(response.headers.get('cache-control'), 'public, max-age=0, must-revalidate');
  assert.equal(await db.collection('restaurants').findOne({ slug: 'publiq-superclub' }), undefined, 'public demo should work without a restaurant record or admin');
  assert.deepEqual(PUBLIQ_INTERNAL_FOOD_COST_NOTES, { 'Mozzarella Stick': 36, Gyoza: 35, 'Spaghetti Bolognese': 32 });

  const restaurant = { _id: 'editable-publiq', name: 'PUBLIQ Super Club', slug: 'publiq-superclub', isActive: true, menuVersion: 2, createdAt: new Date(), updatedAt: new Date() };
  await db.collection('restaurants').insertOne(restaurant);
  await db.collection('publishedMenus').insertOne({ _id: restaurant._id, restaurantId: restaurant._id, privateSnapshotKey: 'must-not-leak', slug: restaurant.slug, restaurant: { name: 'PUBLIQ Super Club', menuAnnouncement: 'VAT policy from the restaurant record.', internalMemo: 'must-not-leak' }, version: 2, publishedAt: new Date(), categories: [], items: [{ id: 'editable-dish', categoryId: '', name: 'Editable database dish', description: '', price: 500, currency: 'PHP', imageUrl: '', dietaryLabels: [], sortOrder: 0, isAvailable: true, foodCostPercent: 36, adminMemo: 'must-not-leak' }] });
  const editableMenu = await jsonRequest('/api/public/menus/publiq-superclub');
  assert.equal(editableMenu.response.status, 200);
  assert.equal(editableMenu.data.version, 2);
  assert.equal(editableMenu.data.items[0].name, 'Editable database dish');
  assert.equal(Object.hasOwn(editableMenu.data.items[0], 'foodCostPercent'), false);
  assert.equal(Object.hasOwn(editableMenu.data.items[0], 'adminMemo'), false);
  assert.equal(Object.hasOwn(editableMenu.data.restaurant, 'internalMemo'), false);
  assert.equal(Object.hasOwn(editableMenu.data, 'privateSnapshotKey'), false);
  assert.equal(Object.hasOwn(editableMenu.data, 'restaurantId'), false);
});

test('Super Admin can use platform routes; credentials never appear in user API data', async () => {
  const { response: listResponse, data: list } = await jsonRequest('/api/restaurants', { cookie: cookies.super });
  assert.equal(listResponse.status, 200);
  assert.equal(list.pagination.total, 2);
  const { response: overviewResponse, data: overview } = await jsonRequest('/api/admin/overview', { cookie: cookies.super });
  assert.equal(overviewResponse.status, 200);
  assert.equal(overview.stats.totalRestaurants, 2);
  const { data: users } = await jsonRequest('/api/users?limit=100', { cookie: cookies.super });
  assert.ok(users.data.every((user) => !Object.hasOwn(user, 'passwordHash')));
  assert.ok(users.data.every((user) => !Object.hasOwn(user, 'sessionSecret')));
  const { response: csvResponse, data: csv } = await jsonRequest('/api/admin/export/users.csv', { cookie: cookies.super });
  assert.equal(csvResponse.status, 200);
  assert.match(csv, /restaurant_memberships/);
  assert.doesNotMatch(csv, /passwordHash|sessionSecret/);
  assert.equal((await jsonRequest('/api/admin/export/users.csv', { cookie: cookies.editor })).response.status, 403);
});

test('Restaurant Admin and Menu Editor are tenant-scoped; client role escalation is denied', async () => {
  assert.equal((await jsonRequest(`/api/restaurants/${ids.restaurantA}`, { cookie: cookies.admin })).response.status, 200);
  assert.equal((await jsonRequest(`/api/restaurants/${ids.restaurantB}`, { cookie: cookies.admin })).response.status, 403);
  assert.equal((await jsonRequest(`/api/restaurants/${ids.restaurantB}/menu-items`, { cookie: cookies.admin })).response.status, 403);

  const editorResponse = await jsonRequest(`/api/restaurants/${ids.restaurantA}/menu-items`, { cookie: cookies.editor });
  assert.equal(editorResponse.response.status, 200);
  assert.equal(editorResponse.data.pagination.total, 1);
  assert.equal(editorResponse.data.data[0].foodCostPercent, 35, 'authorized admin API retains internal food-cost target');
  assert.equal((await jsonRequest(`/api/restaurants/${ids.restaurantB}/menu-items`, { cookie: cookies.editor })).response.status, 403);

  assert.equal((await jsonRequest('/api/restaurants', { method: 'POST', cookie: cookies.editor, body: { name: 'Escalated', slug: 'escalated', globalRole: 'SUPER_ADMIN' } })).response.status, 403);
  assert.equal((await jsonRequest(`/api/users/${ids.editor}/status`, { method: 'PATCH', cookie: cookies.editor, body: { isActive: true, globalRole: 'SUPER_ADMIN' } })).response.status, 403);
  assert.equal((await jsonRequest(`/api/restaurants/${ids.restaurantA}`, { method: 'PATCH', cookie: cookies.admin, body: { menuEditorManagementEnabled: true } })).response.status, 403);
  assert.equal((await jsonRequest('/api/admin/overview', { cookie: 'qr_session=SUPER_ADMIN' })).response.status, 401);
});

test('Menu Editor cannot publish without an explicit grant and cannot cross-edit IDs', async () => {
  const denied = await jsonRequest(`/api/restaurants/${ids.restaurantA}/publish`, { method: 'POST', cookie: cookies.editor, body: {} });
  assert.equal(denied.response.status, 403);
  const crossEdit = await jsonRequest(`/api/restaurants/${ids.restaurantA}/menu-items/${ids.itemB}`, { method: 'PATCH', cookie: cookies.editor, body: { price: 1 } });
  assert.equal(crossEdit.response.status, 404);
  const update = await jsonRequest(`/api/restaurants/${ids.restaurantA}/menu-items/${ids.itemA}`, { method: 'PATCH', cookie: cookies.editor, body: { price: 310, isAvailable: false, foodCostPercent: 36.5 } });
  assert.equal(update.response.status, 200, JSON.stringify(update.data));
  assert.equal(update.data.item.price, 310);
  assert.equal(update.data.item.foodCostPercent, 36.5);
});

test('explicit publish permission works; published snapshot increments and emits audit events', async () => {
  const publish = await jsonRequest(`/api/restaurants/${ids.restaurantA}/publish`, { method: 'POST', cookie: cookies.limited, body: {} });
  assert.equal(publish.response.status, 200, JSON.stringify(publish.data));
  assert.equal(publish.data.version, 1);
  const publicMenu = await jsonRequest('/api/public/menus/restaurant-a');
  assert.equal(publicMenu.response.status, 200);
  assert.equal(publicMenu.data.version, 1);
  assert.equal(publicMenu.data.items[0].name, 'Test menu item');
  assert.equal(Object.hasOwn(publicMenu.data.items[0], 'foodCostPercent'), false, 'internal food-cost notes must never be published');
  assert.equal(publicMenu.response.headers.get('cache-control'), 'public, max-age=0, must-revalidate');
  const audit = await db.collection('auditEvents').find({ restaurantId: ids.restaurantA }).toArray();
  assert.ok(audit.some((event) => event.action === 'MENU_PUBLISHED'));
  assert.ok(audit.every((event) => !JSON.stringify(event).includes('tokenHash')));
});

test('suspended accounts and revoked memberships are enforced on the next API call', async () => {
  const user = await db.collection('users').findOne({ _id: ids.editor });
  await db.collection('users').updateOne({ _id: user._id }, { $set: { isActive: false } });
  assert.equal((await jsonRequest(`/api/restaurants/${ids.restaurantA}/menu-items`, { cookie: cookies.editor })).response.status, 401);

  const membership = await db.collection('memberships').findOne({ userId: ids.admin, restaurantId: ids.restaurantA });
  await db.collection('memberships').updateOne({ _id: membership._id }, { $set: { isActive: false } });
  assert.equal((await jsonRequest(`/api/restaurants/${ids.restaurantA}/menu-items`, { cookie: cookies.admin })).response.status, 403);
});

test('restaurant suspension blocks online public access and publication without deleting menu data', async () => {
  await jsonRequest(`/api/restaurants/${ids.restaurantA}/publish`, { method: 'POST', cookie: cookies.admin, body: {} });
  const suspended = await jsonRequest(`/api/restaurants/${ids.restaurantA}/status`, { method: 'PATCH', cookie: cookies.super, body: { isActive: false } });
  assert.equal(suspended.response.status, 200);
  assert.equal((await jsonRequest('/api/public/menus/restaurant-a')).response.status, 404);
  assert.equal((await jsonRequest(`/api/restaurants/${ids.restaurantA}/publish`, { method: 'POST', cookie: cookies.admin, body: {} })).response.status, 403);
  assert.ok(await db.collection('menuItems').findOne({ _id: ids.itemA }));
});

test('invitations are one-time, expire, create scoped membership, and audit without secrets', async () => {
  const invite = await jsonRequest('/api/invitations', {
    method: 'POST', cookie: cookies.super,
    body: { email: 'new-editor@example.test', role: 'MENU_EDITOR', restaurantId: ids.restaurantA, permissions: ['menu.read', 'menu.update', 'menu.publish'] },
  });
  assert.equal(invite.response.status, 201, JSON.stringify(invite.data));
  const token = invite.data.inviteUrl.split('#token=')[1];
  assert.ok(token && token.length >= 32);
  const accepted = await jsonRequest('/api/invitations/accept', { method: 'POST', body: { token, name: 'New Editor', password: 'NewStrongPassword!2026' } });
  assert.equal(accepted.response.status, 201, JSON.stringify(accepted.data));
  assert.equal(accepted.data.memberships[0].role, 'MENU_EDITOR');
  assert.deepEqual(accepted.data.memberships[0].permissions.sort(), ['menu.publish', 'menu.read', 'menu.update']);
  const reused = await jsonRequest('/api/invitations/accept', { method: 'POST', body: { token, name: 'New Editor', password: 'NewStrongPassword!2026' } });
  assert.equal(reused.response.status, 400);

  const expiredInvite = await jsonRequest('/api/invitations', { method: 'POST', cookie: cookies.super, body: { email: 'expired@example.test', role: 'RESTAURANT_ADMIN', restaurantId: ids.restaurantB } });
  assert.equal(expiredInvite.response.status, 201);
  const expiredToken = expiredInvite.data.inviteUrl.split('#token=')[1];
  await db.collection('invitations').updateOne({ _id: expiredInvite.data.invitation.id }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
  assert.equal((await jsonRequest('/api/invitations/accept', { method: 'POST', body: { token: expiredToken, name: 'Expired User', password: 'ExpiredPassword!2026' } })).response.status, 400);
  const audit = await db.collection('auditEvents').find({}).toArray();
  assert.ok(audit.some((event) => event.action === 'USER_INVITED'));
  assert.ok(audit.some((event) => event.action === 'MEMBERSHIP_ACCEPTED'));
  assert.ok(audit.every((event) => !JSON.stringify(event).includes(token)));
});

test('mutating requests reject a mismatched Origin and unknown fields fail validation', async () => {
  const csrf = await jsonRequest(`/api/restaurants/${ids.restaurantA}/menu-items/${ids.itemA}`, { method: 'PATCH', cookie: cookies.admin, origin: 'https://evil.example', body: { price: 1 } });
  assert.equal(csrf.response.status, 403);
  const massAssignment = await jsonRequest(`/api/restaurants/${ids.restaurantA}`, { method: 'PATCH', cookie: cookies.super, body: { isActive: false, globalRole: 'SUPER_ADMIN' } });
  assert.equal(massAssignment.response.status, 400);
});
