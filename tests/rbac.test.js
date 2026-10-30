import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryDb } from '../src/store.js';
import { authorizeRestaurant, MEMBERSHIP_ROLE, PERMISSION } from '../src/rbac.js';

const activeUser = (id, globalRole = null) => ({ _id: id, globalRole, isActive: true });

test('restaurant-scoped RBAC grants only explicitly assigned editor permissions', async () => {
  const db = createMemoryDb();
  await db.collection('restaurants').insertOne({ _id: 'r-a', isActive: true });
  await db.collection('restaurants').insertOne({ _id: 'r-b', isActive: true });
  await db.collection('memberships').insertOne({ _id: 'm-editor', userId: 'u-editor', restaurantId: 'r-a', role: MEMBERSHIP_ROLE.MENU_EDITOR, permissions: [PERMISSION.MENU_READ, PERMISSION.MENU_UPDATE], isActive: true });
  const editor = activeUser('u-editor');

  const access = await authorizeRestaurant(db, editor, 'r-a', PERMISSION.MENU_UPDATE);
  assert.equal(access.role, MEMBERSHIP_ROLE.MENU_EDITOR);
  assert.deepEqual(access.permissions, [PERMISSION.MENU_READ, PERMISSION.MENU_UPDATE]);
  await assert.rejects(() => authorizeRestaurant(db, editor, 'r-a', PERMISSION.MENU_PUBLISH), { status: 403 });
  await assert.rejects(() => authorizeRestaurant(db, editor, 'r-b', PERMISSION.MENU_READ), { status: 403 });
});

test('Restaurant Admin is scoped to assigned restaurants and unknown roles fail closed', async () => {
  const db = createMemoryDb();
  await db.collection('restaurants').insertOne({ _id: 'r-a', isActive: true });
  await db.collection('restaurants').insertOne({ _id: 'r-b', isActive: true });
  await db.collection('memberships').insertOne({ _id: 'm-admin', userId: 'u-admin', restaurantId: 'r-a', role: MEMBERSHIP_ROLE.RESTAURANT_ADMIN, isActive: true });
  await db.collection('memberships').insertOne({ _id: 'm-unknown', userId: 'u-unknown', restaurantId: 'r-a', role: 'PLATFORM_OWNER', permissions: ['*'], isActive: true });
  const admin = activeUser('u-admin');
  assert.equal((await authorizeRestaurant(db, admin, 'r-a', PERMISSION.MENU_PUBLISH)).role, MEMBERSHIP_ROLE.RESTAURANT_ADMIN);
  await assert.rejects(() => authorizeRestaurant(db, admin, 'r-b', PERMISSION.RESTAURANT_READ), { status: 403 });
  await assert.rejects(() => authorizeRestaurant(db, activeUser('u-unknown'), 'r-a', PERMISSION.MENU_READ), { status: 403 });
});

test('Super Admin is platform-wide only when the database account is active', async () => {
  const db = createMemoryDb();
  await db.collection('restaurants').insertOne({ _id: 'r-a', isActive: true });
  const superAdmin = activeUser('u-super', 'SUPER_ADMIN');
  assert.equal((await authorizeRestaurant(db, superAdmin, 'r-a', PERMISSION.MENU_PUBLISH)).role, 'SUPER_ADMIN');
  await assert.rejects(() => authorizeRestaurant(db, { ...superAdmin, isActive: false }, 'r-a', PERMISSION.MENU_READ), { status: 401 });
});
