import { z } from 'zod';

const shortText = z.string().trim().min(1).max(160);
const urlOrEmpty = z.string().trim().max(2048).refine((value) => value === '' || /^https?:\/\//i.test(value) || /^\/uploads\/[a-zA-Z0-9._-]+$/.test(value), 'Use an http(s) URL or a platform upload path.');
const contactSchema = z.object({
  phone: z.string().trim().max(40).optional(),
  email: z.string().trim().email().max(254).optional().or(z.literal('')),
  website: urlOrEmpty.optional(),
  address: z.string().trim().max(500).optional(),
}).strict();

export const restaurantCreateSchema = z.object({
  name: shortText,
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase letters, numbers, and hyphens.'),
  description: z.string().trim().max(2000).optional().default(''),
  contact: contactSchema.optional().default({}),
  logoUrl: urlOrEmpty.optional().default(''),
  coverImageUrl: urlOrEmpty.optional().default(''),
  menuEditorManagementEnabled: z.boolean().optional().default(false),
}).strict();

export const restaurantUpdateSchema = z.object({
  name: shortText.optional(),
  description: z.string().trim().max(2000).optional(),
  contact: contactSchema.optional(),
  logoUrl: urlOrEmpty.optional(),
  coverImageUrl: urlOrEmpty.optional(),
  menuEditorManagementEnabled: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'Provide at least one field.');

export const categorySchema = z.object({
  name: shortText,
  description: z.string().trim().max(500).optional().default(''),
  sortOrder: z.number().int().min(0).max(100000).optional().default(0),
  isActive: z.boolean().optional().default(true),
}).strict();

export const categoryUpdateSchema = z.object({
  name: shortText.optional(),
  description: z.string().trim().max(500).optional(),
  sortOrder: z.number().int().min(0).max(100000).optional(),
  isActive: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'Provide at least one field.');

export const menuItemSchema = z.object({
  categoryId: z.string().trim().max(80).optional().default(''),
  name: shortText,
  description: z.string().trim().max(2000).optional().default(''),
  price: z.number().finite().min(0).max(10000000),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).optional().default('PHP'),
  imageUrl: urlOrEmpty.optional().default(''),
  dietaryLabels: z.array(z.string().trim().min(1).max(40)).max(12).optional().default([]),
  foodCostPercent: z.number().finite().min(0).max(100).nullable().optional(),
  sortOrder: z.number().int().min(0).max(100000).optional().default(0),
  isAvailable: z.boolean().optional().default(true),
}).strict();

export const menuItemUpdateSchema = z.object({
  categoryId: z.string().trim().max(80).optional(),
  name: shortText.optional(),
  description: z.string().trim().max(2000).optional(),
  price: z.number().finite().min(0).max(10000000).optional(),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).optional(),
  imageUrl: urlOrEmpty.optional(),
  dietaryLabels: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
  foodCostPercent: z.number().finite().min(0).max(100).nullable().optional(),
  sortOrder: z.number().int().min(0).max(100000).optional(),
  isAvailable: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'Provide at least one field.');

export const inviteSchema = z.object({
  email: z.string().trim().email().max(254),
  role: z.enum(['RESTAURANT_ADMIN', 'MENU_EDITOR']),
  restaurantId: z.string().trim().min(1).max(80),
  permissions: z.array(z.enum([
    'menu.read', 'menu.create', 'menu.update', 'menu.delete', 'menu.publish', 'category.manage',
  ])).max(6).optional(),
}).strict();

export const membershipUpdateSchema = z.object({
  permissions: z.array(z.enum([
    'menu.read', 'menu.create', 'menu.update', 'menu.delete', 'menu.publish', 'category.manage',
  ])).max(6).optional(),
  role: z.enum(['RESTAURANT_ADMIN', 'MENU_EDITOR']).optional(),
  isActive: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'Provide at least one field.');

export const restaurantStatusSchema = z.object({ isActive: z.boolean() }).strict();
export const userStatusSchema = z.object({ isActive: z.boolean() }).strict();
export const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
}).strict();
export const invitationAcceptSchema = z.object({
  token: z.string().min(32).max(256),
  name: shortText.optional(),
  password: z.string().min(12).max(128).optional(),
}).strict();
