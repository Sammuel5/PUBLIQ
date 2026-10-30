import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { connectMongo } from '../src/store.js';
import { getPublicDemoMenu, PUBLIQ_INTERNAL_FOOD_COST_NOTES } from '../src/demo-menus.js';

const slug = 'publiq-superclub';

async function main() {
  if (process.env.DEMO_MODE === 'true') throw new Error('The persistent PUBLIQ seed requires MongoDB; DEMO_MODE is not allowed.');
  const store = await connectMongo({ uri: process.env.MONGODB_URI, dbName: process.env.MONGODB_DB || 'qr_restaurant_menu' });
  const { db } = store;
  const restaurantId = randomUUID();
  const source = getPublicDemoMenu(slug);
  const createdAt = new Date();
  const publishedAt = createdAt;
  const categoryIds = new Map(source.categories.map((category) => [category.id, randomUUID()]));
  const categories = source.categories.map((category) => ({
    _id: categoryIds.get(category.id),
    restaurantId,
    name: category.name,
    description: category.description,
    sortOrder: category.sortOrder,
    isActive: true,
    createdAt,
    updatedAt: createdAt,
  }));
  const items = source.items.map((item) => ({
    _id: randomUUID(),
    restaurantId,
    categoryId: categoryIds.get(item.categoryId) || '',
    name: item.name,
    description: item.description,
    price: item.price,
    currency: item.currency,
    imageUrl: item.imageUrl,
    dietaryLabels: item.dietaryLabels,
    ...(Object.hasOwn(PUBLIQ_INTERNAL_FOOD_COST_NOTES, item.name) ? { foodCostPercent: PUBLIQ_INTERNAL_FOOD_COST_NOTES[item.name] } : {}),
    sortOrder: item.sortOrder,
    isAvailable: true,
    createdBy: 'initial-menu-seed',
    createdAt,
    updatedAt: createdAt,
  }));
  const restaurant = {
    _id: restaurantId,
    name: source.restaurant.name,
    slug,
    description: source.restaurant.description,
    menuHeaderNote: source.restaurant.menuHeaderNote,
    menuAnnouncement: source.restaurant.menuAnnouncement,
    contact: source.restaurant.contact,
    logoUrl: source.restaurant.logoUrl,
    coverImageUrl: source.restaurant.coverImageUrl,
    menuEditorManagementEnabled: false,
    isActive: true,
    menuVersion: 1,
    publishedAt,
    createdAt,
    updatedAt: createdAt,
  };
  const publishedMenu = {
    _id: restaurantId,
    restaurantId,
    slug,
    restaurant: { ...source.restaurant },
    version: 1,
    publishedAt,
    categories: categories.map((category) => ({ id: category._id, name: category.name, description: category.description, sortOrder: category.sortOrder, isActive: true })),
    // Cost targets stay on private menu-item records; public snapshots contain only guest-facing fields.
    items: items.map((item) => ({ id: item._id, categoryId: item.categoryId, name: item.name, description: item.description, price: item.price, currency: item.currency, imageUrl: item.imageUrl, dietaryLabels: item.dietaryLabels, sortOrder: item.sortOrder, isAvailable: true, createdAt, updatedAt: createdAt })),
  };

  try {
    if (await db.collection('restaurants').findOne({ slug })) {
      throw new Error(`A restaurant with slug "${slug}" already exists. Seed will not overwrite existing restaurant data.`);
    }
    await db.collection('categories').insertMany(categories);
    await db.collection('menuItems').insertMany(items);
    await db.collection('publishedMenus').insertOne(publishedMenu);
    // Create the restaurant last, so it is never public until the menu and snapshot are ready.
    await db.collection('restaurants').insertOne(restaurant);
    console.log(`Seeded ${restaurant.name}: ${items.length} menu items across ${categories.length} categories.`);
    console.log('No user/admin account was created. The initial menu is published; invite an admin after Super Admin bootstrap.');
    console.log(`Guest menu: /menu.html?slug=${slug}`);
  } catch (error) {
    await Promise.allSettled([
      db.collection('restaurants').deleteOne({ _id: restaurantId }),
      db.collection('publishedMenus').deleteOne({ restaurantId }),
      db.collection('categories').deleteMany({ restaurantId }),
      db.collection('menuItems').deleteMany({ restaurantId }),
    ]);
    throw error;
  } finally {
    await store.close();
  }
}

main().catch((error) => {
  console.error(`PUBLIQ menu seed failed: ${error.message}`);
  process.exitCode = 1;
});
