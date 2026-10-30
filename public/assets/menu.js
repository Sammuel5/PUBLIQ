const params = new URLSearchParams(location.search);
const previewId = params.get('preview');
const slug = params.get('slug');
const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const safeImage = (value) => /^\/(?:uploads|assets)\/[a-zA-Z0-9._-]+$/.test(value || '') || /^https:\/\//i.test(value || '') ? value : '';
const date = (value) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '';
const PUBLIQ_PHOTO_SLOTS = {
  'Food Menu': '/assets/publiq-photo-food.svg',
  'Frappes, 16 oz': '/assets/publiq-photo-frappes.svg',
  'Iced Caffeinated Drinks, 16 oz': '/assets/publiq-photo-iced-coffee.svg',
  'Hot Caffeinated Drinks, 12 oz': '/assets/publiq-photo-hot-coffee.svg',
  'Iced Non-Coffee Drinks, 16 oz': '/assets/publiq-photo-iced-noncoffee.svg',
  'Hot Non-Coffee Drinks, 12 oz': '/assets/publiq-photo-hot-noncoffee.svg',
};

const MENU_DB_NAME = 'publiq-super-club-menu-cache';
const LEGACY_MENU_DB_NAME = 'mise-public-menus';
let migrationInFlight;

function openDatabase(name) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('snapshots')) db.createObjectStore('snapshots', { keyPath: 'slug' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Unable to open offline menu storage.'));
  });
}

function getAllSnapshots(db) {
  return new Promise((resolve, reject) => {
    const request = db.transaction('snapshots', 'readonly').objectStore('snapshots').getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error || new Error('Unable to read offline menus.'));
  });
}

function copySnapshots(db, snapshots) {
  if (!snapshots.length) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('snapshots', 'readwrite');
    for (const snapshot of snapshots) tx.objectStore('snapshots').put(snapshot);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error || new Error('Unable to migrate offline menus.'));
  });
}

function deleteLegacyDatabase() {
  return new Promise((resolve) => {
    const request = indexedDB.deleteDatabase(LEGACY_MENU_DB_NAME);
    request.onsuccess = request.onerror = request.onblocked = resolve;
  });
}

async function migrateLegacySnapshots(db) {
  if ((await getAllSnapshots(db)).length) return;
  const legacyDb = await openDatabase(LEGACY_MENU_DB_NAME);
  try {
    const snapshots = await getAllSnapshots(legacyDb);
    if (snapshots.length) await copySnapshots(db, snapshots);
  } finally {
    legacyDb.close();
  }
  await deleteLegacyDatabase();
}

async function openMenuDb() {
  if (!('indexedDB' in window)) throw new Error('IndexedDB is not available.');
  const db = await openDatabase(MENU_DB_NAME);
  if (!migrationInFlight) migrationInFlight = migrateLegacySnapshots(db).catch(() => {});
  await migrationInFlight;
  return db;
}
async function saveSnapshot(snapshot) {
  const db = await openMenuDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('snapshots', 'readwrite');
    tx.objectStore('snapshots').put(snapshot);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
async function readSnapshot(key) {
  try {
    const db = await openMenuDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('snapshots', 'readonly');
      const request = tx.objectStore('snapshots').get(key);
      request.onsuccess = () => { db.close(); resolve(request.result || null); };
      request.onerror = () => { db.close(); reject(request.error); };
    });
  } catch { return null; }
}
async function removeSnapshot(key) {
  try {
    const db = await openMenuDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction('snapshots', 'readwrite');
      tx.objectStore('snapshots').delete(key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch { /* Best-effort cleanup after suspension or unpublishing. */ }
}

function formatPrice(amount, currency = 'PHP') {
  const numericAmount = Number(amount) || 0;
  const minimumFractionDigits = Number.isInteger(numericAmount) ? 0 : 2;
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency, minimumFractionDigits, maximumFractionDigits: 2 }).format(numericAmount); }
  catch { return `${currency} ${minimumFractionDigits ? numericAmount.toFixed(2) : numericAmount.toFixed(0)}`; }
}

function contactText(contact = {}) {
  const values = [];
  if (contact.address) values.push(esc(contact.address));
  if (contact.phone) values.push(`<a href="tel:${encodeURIComponent(contact.phone)}">${esc(contact.phone)}</a>`);
  if (contact.email) values.push(`<a href="mailto:${encodeURIComponent(contact.email)}">${esc(contact.email)}</a>`);
  if (contact.website && /^https:\/\//i.test(contact.website)) values.push(`<a href="${esc(contact.website)}" target="_blank" rel="noopener">Website ↗</a>`);
  return values.join(' · ');
}

function draw(snapshot, { offline = false, preview = false } = {}) {
  const restaurant = snapshot.restaurant || {};
  const isPubliq = snapshot.slug === 'publiq-superclub';
  document.body.classList.toggle('publiq-menu', isPubliq);
  if (isPubliq) {
    $('#menuBrand').innerHTML = '<img class="menu-brand-icon" src="/assets/publiq-super-club-icon.svg" alt=""><span class="menu-brand-name">PUBLIQ Super Club</span>';
    $('#menuFooterBrand').textContent = 'PUBLIQ Super Club · FOOD & CAFÉ';
  }
  $('#restaurantName').textContent = restaurant.name || 'Restaurant menu';
  $('#restaurantDescription').textContent = restaurant.description || (preview ? 'PRIVATE MENU PREVIEW' : 'DIGITAL MENU');
  $('#restaurantContact').innerHTML = contactText(restaurant.contact || {});
  document.title = isPubliq ? `${restaurant.name || 'PUBLIQ Super Club'} · Menu` : `${restaurant.name || 'Menu'} · PUBLIQ Super Club`;
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.content = isPubliq ? '#090909' : '#244b3e';
  const cover = safeImage(restaurant.coverImageUrl || '');
  if (cover) {
    $('#heroCover').hidden = false;
    const coverUrl = new URL(cover, location.origin);
    if (['http:', 'https:'].includes(coverUrl.protocol)) $('#heroCover').style.backgroundImage = `url(${JSON.stringify(coverUrl.href)})`;
  } else $('#heroCover').hidden = true;
  const logo = safeImage(restaurant.logoUrl || '');
  if (logo) { $('#restaurantLogo').src = logo; $('#restaurantLogo').alt = `${restaurant.name || 'Restaurant'} logo`; $('#restaurantLogo').hidden = false; }
  else $('#restaurantLogo').hidden = true;
  const announcement = $('#menuAnnouncement');
  if (!preview && restaurant.menuAnnouncement) {
    announcement.hidden = false;
    announcement.innerHTML = `<span class="menu-announcement-badge">VAT-INCLUSIVE SRP</span><p>${esc(restaurant.menuAnnouncement)}</p>`;
  } else { announcement.hidden = true; announcement.replaceChildren(); }
  const publishedDate = date(snapshot.publishedAt);
  $('#menuVersion').textContent = preview ? `Draft preview · last published v${snapshot.version || 0}` : `Published menu v${snapshot.version || 0}${publishedDate ? ` · ${publishedDate}` : ''}`;
  $('#syncStatus').textContent = offline ? 'Saved for offline viewing' : preview ? 'Private preview · not cached' : 'Menu ready';
  $('#menuHeaderNote').textContent = preview ? 'Private draft preview' : restaurant.menuHeaderNote || 'A menu made for you';

  const status = $('#offlineStatus');
  if (offline || preview) {
    status.hidden = false;
    status.classList.toggle('is-preview', preview);
    status.textContent = preview
      ? 'Private preview — these saved menu edits are not published or available to customers yet.'
      : 'You’re viewing the last menu saved on this device. It may be older than the latest published version.';
  } else status.hidden = true;

  const categories = (snapshot.categories || []).filter((category) => category.isActive !== false).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));
  const items = (snapshot.items || []).slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const categoryItems = categories.map((category) => ({ category, items: items.filter((item) => item.categoryId === category.id) })).filter((entry) => entry.items.length);
  const uncategorized = items.filter((item) => !categories.some((category) => category.id === item.categoryId));
  if (uncategorized.length) categoryItems.push({ category: { id: 'uncategorized', name: 'More to enjoy', description: '', sortOrder: 999999 }, items: uncategorized });
  if (!categoryItems.length && items.length) categoryItems.push({ category: { id: 'menu', name: 'Our menu', description: '', sortOrder: 0 }, items });

  const nav = $('#categoryNav');
  if (categoryItems.length > 1) {
    nav.hidden = false;
    nav.innerHTML = categoryItems.map(({ category }) => `<button type="button" class="category-button" data-scroll-to="category-${esc(category.id)}">${esc(category.name)}</button>`).join('');
  } else { nav.hidden = true; nav.replaceChildren(); }

  const content = $('#menuContent');
  if (!items.length) {
    content.innerHTML = '<div class="menu-empty"><strong>No menu items to show</strong>This restaurant has not added dishes to its current published menu yet.</div>';
    return;
  }
  content.innerHTML = categoryItems.map(({ category, items: dishes }) => `<section class="menu-category" id="category-${esc(category.id)}"><div class="menu-category-header"><div><h2>${esc(category.name)}</h2>${category.description ? `<p>${esc(category.description)}</p>` : ''}</div><span class="menu-category-count">${dishes.length} ${dishes.length === 1 ? 'dish' : 'dishes'}</span></div><div class="menu-items-grid">${dishes.map((item) => {
    const image = safeImage(item.imageUrl);
    const placeholder = isPubliq ? PUBLIQ_PHOTO_SLOTS[categoryNameById.get(item.categoryId)] : '/assets/dish-placeholder.svg';
    return `<article class="customer-item ${image ? 'has-photo' : 'no-photo'} ${item.isAvailable ? '' : 'sold-out-item'}"><img class="customer-item-photo${image ? '' : ' is-placeholder'}" src="${esc(image || placeholder || '/assets/dish-placeholder.svg')}" alt="${image ? `Photo of ${esc(item.name)}` : ''}" loading="${image ? 'lazy' : 'eager'}"><div class="customer-item-copy"><div class="customer-item-head"><h3>${esc(item.name)}</h3>${item.isAvailable ? '' : '<span class="sold-out">Sold out</span>'}</div>${item.description ? `<p class="customer-item-description">${esc(item.description)}</p>` : ''}<div class="customer-item-bottom"><span class="customer-price">${formatPrice(item.price, item.currency)}</span></div>${item.dietaryLabels?.length ? `<div class="dietary-list">${item.dietaryLabels.map((label) => `<span class="dietary-chip">${esc(label)}</span>`).join('')}</div>` : ''}</div></article>`;
  }).join('')}</div></section>`).join('');
}

function displayUnavailable(message) {
  $('#restaurantName').textContent = 'Menu unavailable';
  $('#restaurantDescription').textContent = 'PLEASE TRY AGAIN LATER';
  $('#restaurantContact').textContent = '';
  $('#menuContent').innerHTML = `<div class="menu-empty"><strong>We can’t show this menu right now</strong>${esc(message)}</div>`;
  $('#syncStatus').textContent = '';
  $('#categoryNav').hidden = true;
}

async function start() {
  if (previewId) {
    document.body.insertAdjacentHTML('afterbegin', '<div class="menu-preview-label">PRIVATE PREVIEW · NOT PUBLIC · NOT CACHED</div>');
    try {
      const response = await fetch(`/api/restaurants/${encodeURIComponent(previewId)}/preview`, { credentials: 'same-origin', cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message || 'Sign in with an account that can view this restaurant.');
      draw(data, { preview: true });
    } catch (error) { displayUnavailable(error.message || 'Sign in to view this private preview.'); }
    return;
  }
  if (!slug) return displayUnavailable('Open a restaurant QR code or public menu link to continue.');
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  try {
    const response = await fetch(`/api/public/menus/${encodeURIComponent(slug)}`, { cache: 'no-store' });
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      if (response.status === 404) {
        await removeSnapshot(slug);
        return displayUnavailable(errorData?.error?.message || 'This restaurant menu is currently unavailable.');
      }
      const saved = await readSnapshot(slug);
      if (saved) return draw(saved, { offline: true });
      return displayUnavailable(errorData?.error?.message || 'This restaurant menu is temporarily unavailable.');
    }
    const snapshot = await response.json();
    await saveSnapshot(snapshot).catch(() => {});
    draw(snapshot);
  } catch {
    const snapshot = await readSnapshot(slug);
    if (snapshot) draw(snapshot, { offline: true });
    else {
      displayUnavailable('You are offline and this menu has not been saved on this device yet. Reconnect once to prepare it for offline browsing.');
      $('#offlineStatus').hidden = false;
      $('#offlineStatus').textContent = 'Offline · connect to load the published menu and prepare offline access.';
    }
  }
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-scroll-to]');
  if (!button) return;
  const target = document.getElementById(button.dataset.scrollTo);
  target?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  $$('.category-button').forEach((entry) => entry.classList.toggle('is-active', entry === button));
});
document.addEventListener('error', (event) => {
  const image = event.target;
  if (image instanceof HTMLImageElement && image.classList.contains('customer-item-photo') && !image.dataset.fallback) {
    image.dataset.fallback = 'true';
    image.src = '/assets/dish-placeholder.svg';
  }
}, true);
function $$(selector) { return [...document.querySelectorAll(selector)]; }
start();
