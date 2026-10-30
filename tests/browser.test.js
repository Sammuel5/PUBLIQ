import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { chromium } from 'playwright';
import { createApp } from '../src/app.js';
import { createMemoryDb } from '../src/store.js';
import { hashPassword, normalizeEmail } from '../src/security.js';

const RUN_BROWSER = process.env.RUN_BROWSER_TESTS === 'true';
const PASSWORD = 'BrowserTest!Password2026';

async function fixture() {
  const db = createMemoryDb();
  const createdAt = new Date(Date.now() - 60_000);
  const passwordHash = await hashPassword(PASSWORD);
  const ids = { admin: randomUUID(), editor: randomUUID(), restaurant: randomUUID(), category: randomUUID(), item: randomUUID() };
  const accounts = [
    { _id: ids.admin, name: 'Mara Santos', email: 'mara@example.test', globalRole: null },
    { _id: ids.editor, name: 'Kai Reyes', email: 'kai@example.test', globalRole: null },
  ];
  for (const account of accounts) await db.collection('users').insertOne({ ...account, emailNormalized: normalizeEmail(account.email), passwordHash, isActive: true, emailVerifiedAt: createdAt, lastLoginAt: null, createdAt, updatedAt: createdAt });
  const restaurant = { _id: ids.restaurant, name: 'Restaurant A', slug: 'restaurant-a', description: '', contact: {}, logoUrl: '', coverImageUrl: '', menuEditorManagementEnabled: true, isActive: true, menuVersion: 1, publishedAt: createdAt, createdAt, updatedAt: createdAt };
  await db.collection('restaurants').insertOne(restaurant);
  await db.collection('memberships').insertOne({ _id: randomUUID(), userId: ids.admin, restaurantId: ids.restaurant, role: 'RESTAURANT_ADMIN', permissions: [], isActive: true, createdAt, updatedAt: createdAt });
  await db.collection('memberships').insertOne({ _id: randomUUID(), userId: ids.editor, restaurantId: ids.restaurant, role: 'MENU_EDITOR', permissions: ['menu.read', 'menu.create', 'menu.update'], isActive: true, createdAt, updatedAt: createdAt });
  await db.collection('categories').insertOne({ _id: ids.category, restaurantId: ids.restaurant, name: 'Mains', description: '', sortOrder: 0, isActive: true, createdAt, updatedAt: createdAt });
  await db.collection('menuItems').insertOne({ _id: ids.item, restaurantId: ids.restaurant, categoryId: ids.category, name: 'Test menu item', description: '', price: 275, currency: 'PHP', imageUrl: '', dietaryLabels: ['Vegetarian'], sortOrder: 0, isAvailable: true, createdAt, updatedAt: createdAt });
  await db.collection('publishedMenus').insertOne({ _id: ids.restaurant, restaurantId: ids.restaurant, slug: restaurant.slug, restaurant: { name: restaurant.name, description: restaurant.description, contact: {} }, version: 1, publishedAt: createdAt, categories: [{ id: ids.category, name: 'Mains', description: '', sortOrder: 0, isActive: true }], items: [{ id: ids.item, categoryId: ids.category, name: 'Test menu item', description: '', price: 275, currency: 'PHP', imageUrl: '', dietaryLabels: ['Vegetarian'], sortOrder: 0, isAvailable: true, createdAt, updatedAt: createdAt }] });

  const app = createApp({ db, config: { production: false, sessionTtlHours: 12, invitationTtlHours: 48, uploadMaxMb: 5 } });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  async function login(email) {
    const response = await fetch(`${baseUrl}/api/auth/login`, { method: 'POST', headers: { Origin: baseUrl, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: PASSWORD }) });
    assert.equal(response.status, 200, await response.text());
    const cookie = response.headers.get('set-cookie').split(';')[0];
    return { name: cookie.slice(0, cookie.indexOf('=')), value: cookie.slice(cookie.indexOf('=') + 1) };
  }
  return { db, ids, server, baseUrl, login };
}

async function startPage(system, email, viewport = { width: 390, height: 844 }) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport });
  await context.addCookies([{ ...(await system.login(email)), url: system.baseUrl, httpOnly: true, sameSite: 'Strict' }]);
  const page = await context.newPage();
  return { browser, context, page };
}

function closeServer(server) { return new Promise((resolve) => server.close(resolve)); }

test('browser: responsive admin shell, mobile drawer, and phone-sized menu form', { skip: !RUN_BROWSER }, async () => {
  const system = await fixture();
  let browser;
  try {
    const started = await startPage(system, 'mara@example.test');
    browser = started.browser;
    const page = started.page;
    const browserErrors = [];
    page.on('pageerror', (error) => browserErrors.push(error.message));
    await page.goto(`${system.baseUrl}/admin.html`);
    await page.getByRole('heading', { name: 'Restaurant overview' }).waitFor();

    const viewports = [[320,568],[360,800],[390,844],[430,932],[768,1024],[1024,768],[1366,768],[1920,1080]];
    for (const [width, height] of viewports) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(40);
      const dimensions = await page.evaluate(() => ({ width: innerWidth, documentWidth: document.documentElement.scrollWidth }));
      assert.ok(dimensions.documentWidth <= dimensions.width, `horizontal overflow at ${width}x${height}: ${dimensions.documentWidth}px`);
      if (width <= 720) {
        const menuButton = page.locator('#mobileMenuButton');
        await menuButton.click();
        assert.equal(await menuButton.getAttribute('aria-expanded'), 'true');
        await page.keyboard.press('Escape');
        assert.equal(await menuButton.getAttribute('aria-expanded'), 'false');
        assert.equal(await page.evaluate(() => document.activeElement?.id), 'mobileMenuButton');
      }
    }

    await page.setViewportSize({ width: 320, height: 568 });
    await page.locator('#mobileMenuButton').click();
    await page.getByRole('button', { name: 'Menu management' }).click();
    await page.locator('#pageContent').getByRole('heading', { name: 'Menu management' }).waitFor();
    assert.equal(await page.locator('#mobileMenuButton').getAttribute('aria-expanded'), 'false');
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'mobileMenuButton');

    await page.getByRole('button', { name: '＋ Add item' }).click();
    const dialog = page.locator('#appDialog');
    await dialog.waitFor({ state: 'visible' });
    const bounds = await dialog.boundingBox();
    assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= 320, `dialog exceeds 320px viewport: ${JSON.stringify(bounds)}`);
    assert.equal(await page.locator('#itemPrice').getAttribute('inputmode'), 'decimal');
    assert.equal(await page.locator('#itemImageUrl').getAttribute('type'), 'text');
    assert.equal(await page.locator('#itemFoodCostPercent').getAttribute('max'), '100');
    assert.match(await page.locator('#appDialog').textContent(), /Internal only; not shown to guests/);
    assert.match(await page.locator('#itemImageFile').getAttribute('accept'), /image\/webp/);
    assert.deepEqual(browserErrors, []);
  } finally {
    await browser?.close();
    await closeServer(system.server);
  }
});

test('browser: Menu Editor sees only granted actions and public menu works offline from IndexedDB', { skip: !RUN_BROWSER }, async () => {
  const system = await fixture();
  let browser;
  try {
    const started = await startPage(system, 'kai@example.test');
    browser = started.browser;
    const page = started.page;
    await page.goto(`${system.baseUrl}/admin.html`);
    await page.getByRole('heading', { name: 'Restaurant overview' }).waitFor();
    await page.locator('#mobileMenuButton').click();
    await page.getByRole('button', { name: 'Menu items' }).click();
    await page.locator('#pageContent').getByRole('heading', { name: 'Menu management' }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Publish menu' }).count(), 0);

    const publicPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const publicErrors = [];
    publicPage.on('pageerror', (error) => publicErrors.push(error.message));
    await publicPage.goto(`${system.baseUrl}/menu.html?slug=restaurant-a`);
    await publicPage.getByRole('heading', { name: 'Test menu item' }).waitFor({ timeout: 10000 });
    await publicPage.evaluate(async () => { await navigator.serviceWorker.ready; });
    await publicPage.reload();
    await publicPage.getByRole('heading', { name: 'Test menu item' }).waitFor();
    await publicPage.context().setOffline(true);
    await publicPage.reload();
    await publicPage.getByText('You’re viewing the last menu saved on this device.').waitFor();
    await publicPage.getByRole('heading', { name: 'Test menu item' }).waitFor();
    const cacheKeys = await publicPage.evaluate(async () => {
      const keys = await caches.keys();
      const all = [];
      for (const key of keys) {
        const cache = await caches.open(key);
        for (const request of await cache.keys()) all.push(request.url);
      }
      return all;
    });
    assert.ok(cacheKeys.every((url) => !new URL(url).pathname.startsWith('/api/')), 'private/admin API response was cached');
    assert.deepEqual(publicErrors, []);
  } finally {
    await browser?.close();
    await closeServer(system.server);
  }
});

test('browser: PUBLIQ customer menu and logo are public without signing in', { skip: !RUN_BROWSER }, async () => {
  const system = await fixture();
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${system.baseUrl}/menu.html?slug=publiq-superclub`);
    await page.getByRole('heading', { name: 'PUBLIQ Super Club' }).waitFor();
    await page.locator('#menuAnnouncement').waitFor({ state: 'visible' });
    assert.equal(await page.locator('.customer-item').count(), 56);
    assert.equal(await page.locator('#categoryNav button').count(), 6);
    const placeholderImages = page.locator('.customer-item.no-photo .customer-item-photo');
    assert.equal(await placeholderImages.count(), 56, 'every dish has an image slot');
    assert.equal(await placeholderImages.first().isVisible(), true, 'photo placeholder is displayed on each dish card');
    const placeholderPaths = await placeholderImages.evaluateAll((images) => images.map((image) => new URL(image.src).pathname));
    const placeholderAssets = ['/assets/publiq-photo-food.svg', '/assets/publiq-photo-frappes.svg', '/assets/publiq-photo-iced-coffee.svg', '/assets/publiq-photo-hot-coffee.svg', '/assets/publiq-photo-iced-noncoffee.svg', '/assets/publiq-photo-hot-noncoffee.svg'];
    for (const imagePath of placeholderAssets) assert.ok(placeholderPaths.includes(imagePath), `${imagePath} placeholder is present`);
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    const precachedAssets = await page.evaluate(async () => {
      const found = [];
      for (const key of await caches.keys()) {
        const cache = await caches.open(key);
        found.push(...(await cache.keys()).map((request) => new URL(request.url).pathname));
      }
      return found;
    });
    for (const imagePath of placeholderAssets) assert.ok(precachedAssets.includes(imagePath), `${imagePath} is cached for offline viewing`);
    assert.equal(await page.locator('#restaurantLogo').getAttribute('src'), '/assets/publiq-superclub-logo.jpg');
    assert.match(await page.locator('#menuBrand').textContent(), /PUBLIQ Super Club/);
    assert.match(await page.locator('#menuAnnouncement').textContent(), /12% VAT/);
    assert.match(await page.locator('#menuAnnouncement').textContent(), /No additional service charge/);
    const response = await page.evaluate(() => fetch('/api/public/menus/publiq-superclub').then((result) => result.json()));
    assert.ok(response.items.every((item) => !Object.hasOwn(item, 'foodCostPercent')));
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    await closeServer(system.server);
  }
});
