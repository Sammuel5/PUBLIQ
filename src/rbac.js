import { HttpError } from './errors.js';

export const GLOBAL_ROLE = Object.freeze({ SUPER_ADMIN: 'SUPER_ADMIN' });
export const MEMBERSHIP_ROLE = Object.freeze({ RESTAURANT_ADMIN: 'RESTAURANT_ADMIN', MENU_EDITOR: 'MENU_EDITOR' });

export const PERMISSION = Object.freeze({
  RESTAURANT_READ: 'restaurant.read',
  RESTAURANT_UPDATE: 'restaurant.update',
  MENU_READ: 'menu.read',
  MENU_CREATE: 'menu.create',
  MENU_UPDATE: 'menu.update',
  MENU_DELETE: 'menu.delete',
  MENU_PUBLISH: 'menu.publish',
  CATEGORY_MANAGE: 'category.manage',
  MENU_EDITOR_MANAGE: 'menu_editor.manage',
  QR_MANAGE: 'qr.manage',
  ACTIVITY_READ: 'activity.read',
});

export const ALL_PERMISSIONS = Object.freeze(Object.values(PERMISSION));
export const EDITOR_GRANTABLE_PERMISSIONS = Object.freeze([
  PERMISSION.MENU_READ,
  PERMISSION.MENU_CREATE,
  PERMISSION.MENU_UPDATE,
  PERMISSION.MENU_DELETE,
  PERMISSION.MENU_PUBLISH,
  PERMISSION.CATEGORY_MANAGE,
]);

const RESTAURANT_ADMIN_PERMISSIONS = new Set(ALL_PERMISSIONS);

export function isSuperAdmin(user) {
  return user?.globalRole === GLOBAL_ROLE.SUPER_ADMIN;
}

export function permissionsForMembership(membership) {
  if (membership?.role === MEMBERSHIP_ROLE.RESTAURANT_ADMIN) return [...RESTAURANT_ADMIN_PERMISSIONS];
  if (membership?.role === MEMBERSHIP_ROLE.MENU_EDITOR) {
    const requested = Array.isArray(membership.permissions) ? membership.permissions : [];
    return requested.filter((permission) => EDITOR_GRANTABLE_PERMISSIONS.includes(permission));
  }
  return [];
}

export async function requireSuperAdmin(user) {
  if (!isSuperAdmin(user)) throw new HttpError(403, 'Super Admin access is required.', 'FORBIDDEN');
}

/** Resolve and verify one restaurant-scoped authorization on the server. */
export async function authorizeRestaurant(db, user, restaurantId, permission) {
  if (!user?._id || user.isActive !== true) throw new HttpError(401, 'Authentication required.', 'UNAUTHENTICATED');
  if (!restaurantId || typeof restaurantId !== 'string') throw new HttpError(400, 'A restaurant context is required.', 'RESTAURANT_CONTEXT_REQUIRED');

  const restaurant = await db.collection('restaurants').findOne({ _id: restaurantId });
  if (!restaurant) throw new HttpError(404, 'Restaurant not found.', 'NOT_FOUND');

  if (isSuperAdmin(user)) return { restaurant, membership: null, role: 'SUPER_ADMIN', permissions: [...ALL_PERMISSIONS] };

  const membership = await db.collection('memberships').findOne({
    userId: user._id,
    restaurantId,
    isActive: true,
  });
  if (!membership || !Object.values(MEMBERSHIP_ROLE).includes(membership.role)) {
    throw new HttpError(403, 'You are not assigned to this restaurant.', 'RESTAURANT_SCOPE_DENIED');
  }
  const permissions = permissionsForMembership(membership);
  if (!permissions.includes(permission)) throw new HttpError(403, 'You do not have permission to perform this action.', 'PERMISSION_DENIED');
  return { restaurant, membership, role: membership.role, permissions };
}

export async function requireRestaurantAdmin(db, user, restaurantId) {
  const access = await authorizeRestaurant(db, user, restaurantId, PERMISSION.RESTAURANT_UPDATE);
  if (access.role !== MEMBERSHIP_ROLE.RESTAURANT_ADMIN && access.role !== 'SUPER_ADMIN') {
    throw new HttpError(403, 'Restaurant Admin access is required.', 'FORBIDDEN');
  }
  return access;
}

export function toPublicMembership(membership) {
  return {
    id: membership._id,
    userId: membership.userId,
    restaurantId: membership.restaurantId,
    role: membership.role,
    permissions: permissionsForMembership(membership),
    isActive: membership.isActive,
    createdAt: membership.createdAt,
    updatedAt: membership.updatedAt,
  };
}
