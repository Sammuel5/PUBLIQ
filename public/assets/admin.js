const state = {
  user: null, memberships: [], selectedRestaurantId: null, restaurant: null,
  page: 'overview', nav: [], renderToken: 0,
  restaurantPage: 1, restaurantSearch: '', restaurantStatus: '', restaurantSort: 'updatedAt', restaurantDirection: 'desc',
  userPage: 1, userSearch: '', userRole: '', userStatus: '', userSort: 'createdAt', userDirection: 'desc',
  menuPage: 1, menuSearch: '', menuAvailability: '', categories: [], menuItems: [],
  activityPage: 1, activityAction: '', dialogSubmit: null, drawerOpen: false, toastTimer: null,
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const dateText = (value) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
const priceText = (price, currency = 'PHP') => {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(price) || 0); }
  catch { return `${currency} ${Number(price || 0).toFixed(2)}`; }
};
const initials = (name) => String(name || 'M').trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('') || 'M';
const getActiveMembership = () => state.memberships.find((membership) => membership.restaurantId === state.selectedRestaurantId) || null;
const isSuperAdmin = () => state.user?.globalRole === 'SUPER_ADMIN';
const hasPermission = (permission) => isSuperAdmin() || Boolean(getActiveMembership()?.permissions?.includes(permission));
const canManageEditors = () => isSuperAdmin() || (getActiveMembership()?.role === 'RESTAURANT_ADMIN' && state.restaurant?.menuEditorManagementEnabled === true);
const restaurantId = () => state.selectedRestaurantId;

async function api(url, options = {}) {
  const requestOptions = { credentials: 'same-origin', cache: 'no-store', ...options };
  requestOptions.headers = { ...(options.headers || {}) };
  if (options.body && !(options.body instanceof FormData) && typeof options.body !== 'string') {
    requestOptions.headers['Content-Type'] = 'application/json';
    requestOptions.body = JSON.stringify(options.body);
  }
  const response = await fetch(url, requestOptions);
  let data = null;
  if (response.status !== 204) {
    const type = response.headers.get('content-type') || '';
    if (type.includes('application/json')) data = await response.json();
  }
  if (response.status === 401 && !url.startsWith('/api/auth/login')) {
    location.replace('/');
    throw new Error('Your session has expired. Sign in again.');
  }
  if (!response.ok) throw new Error(data?.error?.message || `Request failed (${response.status}).`);
  return data;
}

function toast(message) {
  const node = $('#toast');
  if (!node) return;
  node.textContent = message;
  node.classList.add('is-visible');
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => node.classList.remove('is-visible'), 3100);
}

function statusPill(active, positive = 'Active', negative = 'Suspended') {
  return `<span class="status-pill ${active ? 'status-active' : 'status-suspended'}">${active ? positive : negative}</span>`;
}
function accessPill(status) {
  const map = { PENDING: ['status-invited', 'Invited'], EXPIRED: ['status-neutral', 'Expired'], REVOKED: ['status-suspended', 'Revoked'], ACCEPTED: ['status-active', 'Accepted'] };
  const [className, label] = map[status] || ['status-neutral', status || '—'];
  return `<span class="status-pill ${className}">${escapeHTML(label)}</span>`;
}
function pageHeader(title, description, actions = '') {
  return `<div class="page-header"><div><h2>${escapeHTML(title)}</h2><p>${escapeHTML(description)}</p></div>${actions ? `<div class="page-actions">${actions}</div>` : ''}</div>`;
}
function icon(name) {
  const paths = {
    overview: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/>',
    restaurants: '<path d="M4 20h16M6 20V8l6-4 6 4v12M9 10h.01M15 10h.01M9 14h.01M15 14h.01M11 20v-3h2v3"/>',
    users: '<path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM16 4.3a3.5 3.5 0 0 1 0 6.7M17 15h1.5a3.5 3.5 0 0 1 3.5 3.5V20"/>',
    activity: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
    settings: '<path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"/><path d="m19.4 15 .1.1 1.1.8-1.3 2.3-1.3-.6a7.5 7.5 0 0 1-1.5.9l-.2 1.5h-2.6l-.3-1.5a7.5 7.5 0 0 1-1.6-.9l-1.3.6-1.3-2.3 1.2-.9a7.2 7.2 0 0 1 0-1.8l-1.2-.9 1.3-2.3 1.3.6a7.5 7.5 0 0 1 1.6-.9l.3-1.5h2.6l.2 1.5a7.5 7.5 0 0 1 1.5.9l1.3-.6 1.3 2.3-1.1.9a7.2 7.2 0 0 1-.1 1.8Z"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16M8 4v16"/>',
    categories: '<path d="M4 5h16M4 12h10M4 19h7M18 10v7M14.5 13.5h7"/>',
    qr: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z"/>',
    profile: '<circle cx="12" cy="8" r="3.5"/><path d="M4 20a8 8 0 0 1 16 0"/>',
    preview: '<path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/>',
  };
  return `<span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24">${paths[name] || paths.overview}</svg></span>`;
}

function buildNav() {
  if (isSuperAdmin()) {
    return [
      ['overview', 'Overview', 'overview'],
      ['restaurants', 'Restaurants', 'restaurants'],
      ['users', 'Users & access', 'users'],
      ['activity', 'Activity logs', 'activity'],
      ['platform-settings', 'Platform settings', 'settings'],
      ['profile', 'Profile', 'profile'],
    ];
  }
  const membership = getActiveMembership();
  if (!membership) return [];
  const nav = [['overview', 'Overview', 'overview'], ['menu-items', membership.role === 'RESTAURANT_ADMIN' ? 'Menu management' : 'Menu items', 'menu']];
  if (hasPermission('category.manage')) nav.push(['categories', 'Categories', 'categories']);
  if (membership.role === 'RESTAURANT_ADMIN' && canManageEditors()) nav.push(['menu-editors', 'Menu editors', 'users']);
  if (membership.role === 'RESTAURANT_ADMIN') nav.push(['qr-codes', 'QR codes', 'qr'], ['restaurant-settings', 'Restaurant settings', 'settings']);
  else nav.push(['preview-menu', 'Preview menu', 'preview']);
  if (hasPermission('activity.read')) nav.push(['activity', 'Activity logs', 'activity']);
  nav.push(['profile', 'Profile', 'profile']);
  return nav;
}

function applyShell() {
  state.nav = buildNav();
  const nav = $('#navList');
  nav.innerHTML = state.nav.map(([page, label, glyph]) => `<li><button type="button" class="nav-link" data-page="${page}" aria-current="${state.page === page ? 'page' : 'false'}">${icon(glyph)}<span>${escapeHTML(label)}</span></button></li>`).join('');
  $('#navScopeLabel').textContent = isSuperAdmin() ? 'PLATFORM' : (getActiveMembership()?.restaurantName || 'RESTAURANT').toUpperCase();
  const roleText = isSuperAdmin() ? 'Super Admin' : (getActiveMembership()?.role === 'RESTAURANT_ADMIN' ? 'Restaurant Admin' : 'Menu Editor');
  $('#sidebarUserName').textContent = state.user?.name || 'Account';
  $('#sidebarUserRole').textContent = roleText;
  $('#sidebarAvatar').textContent = initials(state.user?.name);
  $('#headerAvatar').textContent = initials(state.user?.name);
  $('#headerUserName').textContent = state.user?.name || 'Account';
  const selector = $('#restaurantSelect');
  if (!isSuperAdmin() && state.memberships.length > 1) {
    selector.hidden = false;
    selector.innerHTML = state.memberships.map((membership) => `<option value="${escapeHTML(membership.restaurantId)}" ${membership.restaurantId === state.selectedRestaurantId ? 'selected' : ''}>${escapeHTML(membership.restaurantName)}</option>`).join('');
  } else selector.hidden = true;
  const page = state.nav.find((entry) => entry[0] === state.page);
  if (!page) state.page = 'overview';
  const currentPage = state.nav.find((entry) => entry[0] === state.page) || ['overview', 'Overview'];
  $('#headerTitle').textContent = currentPage[1];
  $('#breadcrumb').innerHTML = `<span>${isSuperAdmin() ? 'Platform' : escapeHTML(getActiveMembership()?.restaurantName || 'Workspace')}</span><span aria-hidden="true">/</span><span>${escapeHTML(currentPage[1])}</span>`;
}

async function loadWorkspace() {
  try {
    const result = await api('/api/auth/me');
    state.user = result.user;
    state.memberships = result.memberships || [];
    if (!isSuperAdmin()) {
      const saved = sessionStorage.getItem(`publiq:selected:${state.user.id}`);
      state.selectedRestaurantId = state.memberships.some((m) => m.restaurantId === saved) ? saved : state.memberships[0]?.restaurantId || null;
      if (state.selectedRestaurantId) sessionStorage.setItem(`publiq:selected:${state.user.id}`, state.selectedRestaurantId);
    }
    if (!isSuperAdmin() && !state.selectedRestaurantId) {
      $('#pageContent').innerHTML = pageHeader('No restaurant access', 'This account does not have an active restaurant membership.') + '<div class="notice notice-warning">Ask a Super Admin to assign you to an active restaurant.</div>';
      applyShell();
      return;
    }
    await refreshRestaurant();
    applyShell();
    await renderPage('overview');
  } catch (error) {
    if (error.message.includes('Failed to fetch')) {
      $('#pageContent').innerHTML = '<div class="empty-state"><strong>Unable to connect</strong><p>Sign-in and administrative actions require a live network connection. Check your connection and reload.</p></div>';
    }
  }
}

async function refreshRestaurant() {
  if (!state.selectedRestaurantId || isSuperAdmin()) { state.restaurant = null; return; }
  try {
    const response = await api(`/api/restaurants/${encodeURIComponent(state.selectedRestaurantId)}`);
    state.restaurant = response.restaurant;
  } catch { state.restaurant = null; }
}

async function navigate(page) {
  if (!state.nav.some((entry) => entry[0] === page)) page = 'overview';
  state.page = page;
  const wasDrawerOpen = state.drawerOpen;
  if (wasDrawerOpen) closeDrawer(true);
  applyShell();
  await renderPage(page, { focusContent: !wasDrawerOpen });
}

async function renderPage(page, { focusContent = true } = {}) {
  const token = ++state.renderToken;
  $('#pageContent').innerHTML = '<div class="loading-state" role="status">Loading workspace…</div>';
  try {
    let html;
    switch (page) {
      case 'overview': html = await renderOverview(); break;
      case 'restaurants': html = await renderRestaurants(); break;
      case 'users': html = await renderUsers(); break;
      case 'menu-items': html = await renderMenuItems(); break;
      case 'categories': html = await renderCategories(); break;
      case 'menu-editors': html = await renderMenuEditors(); break;
      case 'qr-codes': html = await renderQrCodes(); break;
      case 'restaurant-settings': html = await renderRestaurantSettings(); break;
      case 'platform-settings': html = await renderPlatformSettings(); break;
      case 'activity': html = await renderActivity(); break;
      case 'preview-menu': html = await renderPreview(); break;
      case 'profile': html = renderProfile(); break;
      default: html = await renderOverview();
    }
    if (token !== state.renderToken) return;
    $('#pageContent').innerHTML = html;
    if (focusContent) $('#pageContent').focus({ preventScroll: true });
  } catch (error) {
    if (token !== state.renderToken) return;
    $('#pageContent').innerHTML = `<div class="empty-state"><strong>Could not load this page</strong><p>${escapeHTML(error.message)}</p><button class="button button-secondary button-small" data-action="retry-page" type="button" class="mt-14">Try again</button></div>`;
  }
}

async function renderOverview() {
  const result = isSuperAdmin()
    ? await api('/api/admin/overview')
    : await api(`/api/admin/overview?restaurantId=${encodeURIComponent(restaurantId())}`);
  if (isSuperAdmin()) {
    const s = result.stats;
    const stats = [
      ['Total restaurants', s.totalRestaurants, 'Across the platform', 'restaurants'],
      ['Active restaurants', s.activeRestaurants, 'Currently accepting guests', 'overview'],
      ['Suspended', s.suspendedRestaurants, 'Access paused', 'activity'],
      ['Total users', s.totalUsers, `${s.activeUsers} active accounts`, 'users'],
      ['Restaurant admins', s.activeRestaurantAdmins, 'Active memberships', 'users'],
      ['Menu editors', s.activeMenuEditors, 'Active memberships', 'users'],
    ].map(([label, value, note, glyph]) => metricCard(label, value, note, glyph)).join('');
    const recentRows = (result.recentRestaurants || []).map((restaurant) => `<tr><td><div class="cell-primary">${escapeHTML(restaurant.name)}</div><div class="cell-secondary">${escapeHTML(restaurant.slug)}</div></td><td>${statusPill(restaurant.isActive)}</td><td>v${Number(restaurant.menuVersion || 0)}</td><td>${escapeHTML(dateText(restaurant.createdAt))}</td><td><div class="table-actions"><button class="button button-secondary button-small" data-action="invite-admin" data-id="${escapeHTML(restaurant.id)}" type="button">Invite admin</button><a class="button button-quiet button-small" href="/menu.html?slug=${encodeURIComponent(restaurant.slug)}" target="_blank" rel="noopener">Public menu</a></div></td></tr>`).join('');
    const activity = (result.recentActivity || []).map(activityRow).join('') || emptyInline('No platform activity yet.');
    return `${pageHeader('Platform overview', 'A real-time view of restaurant access and recent platform activity.', `<button class="button button-primary" data-action="new-restaurant" type="button">＋ New restaurant</button>`)}
      <div class="stats-grid">${stats}</div>
      <div class="overview-grid"><section class="panel"><div class="panel-head"><h3 class="section-title">Recently created restaurants</h3><button class="button button-quiet button-small" data-page="restaurants" type="button">View directory →</button></div>${result.recentRestaurants?.length ? `<div class="table-wrap table-plain"><table class="data-table"><thead><tr><th>Restaurant</th><th>Status</th><th>Menu</th><th>Created</th><th></th></tr></thead><tbody>${recentRows}</tbody></table></div>` : `<div class="panel-body">${emptyBlock('No restaurants yet','Create the first restaurant to begin inviting administrators.')}</div>`}</section>
      <section class="panel"><div class="panel-head"><h3 class="section-title">Recent platform activity</h3><button class="button button-quiet button-small" data-page="activity" type="button">View logs →</button></div><div class="panel-body"><div class="activity-list">${activity}</div></div></section></div>
      <section class="panel panel-pad mt-15"><div class="section-heading mb-12"><h3 class="section-title">System health</h3>${statusPill(result.health?.database === 'connected', result.health?.database === 'connected' ? 'Operational' : 'Development mode', 'Check configuration')}</div><p class="muted small zero-margin">Database: ${escapeHTML(result.health?.database || '—')} · Process uptime: ${Number(result.health?.uptimeSeconds || 0)} seconds</p></section>`;
  }
  if (!result.restaurant) await refreshRestaurant();
  const s = result.stats;
  const actions = `${hasPermission('menu.create') ? '<button class="button button-primary" data-action="new-item" type="button">＋ Add menu item</button>' : ''}${hasPermission('qr.manage') ? '<button class="button button-secondary" data-page="qr-codes" type="button">Open QR codes</button>' : ''}`;
  const stats = [
    ['Menu items', s.totalMenuItems, `${s.pendingDrafts || 0} with unpublished changes`, 'menu'],
    ['Available dishes', s.availableDishes, 'Ready to order', 'overview'],
    ['Sold out', s.soldOutDishes, 'Currently unavailable', 'activity'],
    ['Active categories', s.activeCategories, 'Organized sections', 'categories'],
    ['Published version', `v${s.publishedVersion || 0}`, s.publishedAt ? `Published ${dateText(s.publishedAt)}` : 'Not published yet', 'preview'],
  ].map(([label, value, note, glyph]) => metricCard(label, value, note, glyph)).join('');
  const recentItems = (result.recentlyEditedItems || []).map((item) => `<div class="activity-row"><span class="activity-dot"></span><div class="activity-main"><strong>${escapeHTML(item.name)}</strong><p>${priceText(item.price, item.currency)} · ${item.isAvailable ? 'Available' : 'Sold out'}</p></div><span class="activity-time">${escapeHTML(dateText(item.updatedAt))}</span></div>`).join('') || emptyInline('No menu items yet. Add your first dish to get started.');
  const activities = (result.recentActivity || []).map(activityRow).join('') || emptyInline('No recent menu activity.');
  const previewUrl = restaurantId() ? `/menu.html?preview=${encodeURIComponent(restaurantId())}` : '#';
  return `${pageHeader('Restaurant overview', `A quick look at ${state.restaurant?.name || result.restaurant?.name || 'your restaurant'} and its published menu.`, actions)}
    <div class="stats-grid">${stats}</div>
    ${state.restaurant?.isActive === false ? '<div class="notice notice-warning mb-15">This restaurant is suspended. Customer-facing menus are unavailable and publishing is blocked. Existing offline customer snapshots may remain visible until devices reconnect.</div>' : ''}
    <div class="overview-grid"><section class="panel"><div class="panel-head"><h3 class="section-title">Recently edited items</h3><button class="button button-quiet button-small" data-page="menu-items" type="button">Manage menu →</button></div><div class="panel-body"><div class="activity-list">${recentItems}</div></div></section>
    <section class="panel"><div class="panel-head"><h3 class="section-title">Recent activity</h3>${hasPermission('activity.read') ? '<button class="button button-quiet button-small" data-page="activity" type="button">View all →</button>' : ''}</div><div class="panel-body"><div class="activity-list">${activities}</div></div></section></div>
    <section class="panel panel-pad mt-15"><div class="section-heading mb-12"><h3 class="section-title">Quick actions</h3><span class="muted small">Stay ready for service</span></div><div class="quick-action-list"><button class="quick-action" data-action="new-item" type="button"><span>Add a menu item</span><span>＋</span></button><button class="quick-action" data-page="categories" type="button"><span>Organize categories</span><span>→</span></button><button class="quick-action" data-page="preview-menu" type="button"><span>Preview unpublished changes</span><span>↗</span></button>${hasPermission('menu.publish') ? '<button class="quick-action" data-action="publish-menu" type="button"><span>Publish menu updates</span><span>↑</span></button>' : ''}</div></section>`;
}

function metricCard(label, value, note, glyph) {
  return `<article class="metric-card"><div class="metric-top"><span class="metric-label">${escapeHTML(label)}</span><span class="metric-icon">${icon(glyph)}</span></div><div class="metric-value">${escapeHTML(value)}</div><div class="metric-note">${escapeHTML(note)}</div></article>`;
}
function emptyInline(message) { return `<div class="muted small inline-note">${escapeHTML(message)}</div>`; }
function emptyBlock(title, text) { return `<div class="empty-state"><strong>${escapeHTML(title)}</strong><p>${escapeHTML(text)}</p></div>`; }
function activityRow(event) {
  const action = String(event.action || '').replaceAll('_', ' ').toLowerCase();
  const target = event.changes?.name || event.changes?.role || event.targetEntityType || 'record';
  return `<div class="activity-row"><span class="activity-dot"></span><div class="activity-main"><strong>${escapeHTML(action)}</strong><p>${escapeHTML(target)}${event.restaurantId ? ` · ${escapeHTML(event.restaurantId)}` : ''}</p></div><span class="activity-time">${escapeHTML(dateText(event.createdAt))}</span></div>`;
}

async function renderRestaurants() {
  const params = new URLSearchParams({ page: String(state.restaurantPage), limit: '10', search: state.restaurantSearch, status: state.restaurantStatus, sort: state.restaurantSort, direction: state.restaurantDirection });
  const result = await api(`/api/restaurants?${params}`);
  const rows = result.data.map((restaurant) => `<tr><td><div class="cell-primary">${escapeHTML(restaurant.name)}</div><div class="cell-secondary">/${escapeHTML(restaurant.slug)}</div></td><td>${statusPill(restaurant.isActive)}</td><td>${Number(restaurant.menuItemCount || 0)}</td><td>${escapeHTML(restaurant.restaurantAdminName || '—')}</td><td>v${Number(restaurant.menuVersion || 0)}<div class="cell-secondary">${restaurant.publishedAt ? `Published ${escapeHTML(dateText(restaurant.publishedAt))}` : 'Not published'}</div></td><td>${escapeHTML(dateText(restaurant.updatedAt))}</td><td><div class="table-actions"><button class="button button-secondary button-small" data-action="edit-restaurant" data-id="${escapeHTML(restaurant.id)}" type="button">Edit</button><button class="button button-quiet button-small" data-action="invite-admin" data-id="${escapeHTML(restaurant.id)}" type="button">Invite admin</button><button class="button button-quiet button-small" data-action="copy-restaurant-url" data-id="${escapeHTML(restaurant.id)}" type="button">Copy URL</button><button class="button button-quiet button-small" data-action="download-restaurant-qr" data-id="${escapeHTML(restaurant.id)}" type="button">QR</button><button class="button button-quiet button-small" data-action="toggle-restaurant" data-id="${escapeHTML(restaurant.id)}" data-active="${restaurant.isActive}" type="button">${restaurant.isActive ? 'Suspend' : 'Reactivate'}</button></div></td></tr>`).join('');
  const cards = result.data.map((restaurant) => `<article class="restaurant-card"><div class="restaurant-card-head"><div><h3>${escapeHTML(restaurant.name)}</h3><div class="slug">/${escapeHTML(restaurant.slug)}</div></div>${statusPill(restaurant.isActive)}</div><div class="card-meta"><div><span>Published menu</span><strong>v${Number(restaurant.menuVersion || 0)}</strong></div><div><span>Last updated</span><strong>${escapeHTML(dateText(restaurant.updatedAt))}</strong></div><div><span>Last publication</span><strong>${escapeHTML(dateText(restaurant.publishedAt))}</strong></div><div><span>Menu items</span><strong>${Number(restaurant.menuItemCount || 0)}</strong></div><div><span>Restaurant admin</span><strong>${escapeHTML(restaurant.restaurantAdminName || 'Not assigned')}</strong></div><div><span>Public menu</span><strong><a class="text-link" href="/menu.html?slug=${encodeURIComponent(restaurant.slug)}" target="_blank" rel="noopener">Preview ↗</a></strong></div></div><div class="card-actions"><button class="button button-secondary button-small" data-action="edit-restaurant" data-id="${escapeHTML(restaurant.id)}" type="button">Edit</button><button class="button button-secondary button-small" data-action="invite-admin" data-id="${escapeHTML(restaurant.id)}" type="button">Invite admin</button><button class="button button-quiet button-small" data-action="copy-restaurant-url" data-id="${escapeHTML(restaurant.id)}" type="button">Copy URL</button><button class="button button-quiet button-small" data-action="download-restaurant-qr" data-id="${escapeHTML(restaurant.id)}" type="button">QR</button><button class="button button-quiet button-small" data-action="toggle-restaurant" data-id="${escapeHTML(restaurant.id)}" data-active="${restaurant.isActive}" type="button">${restaurant.isActive ? 'Suspend' : 'Reactivate'}</button></div></article>`).join('');
  return `${pageHeader('Restaurants', 'Create and manage restaurant workspaces, publication status, and administrator access.', `<a class="button button-secondary" href="/api/admin/export/restaurants.csv">Export CSV</a><button class="button button-primary" data-action="new-restaurant" type="button">＋ Create restaurant</button>`)}
    <div class="toolbar"><form class="toolbar-search" data-submit="restaurant-filter"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg><input type="search" name="search" placeholder="Search restaurants" value="${escapeHTML(state.restaurantSearch)}" aria-label="Search restaurants"></form><select id="restaurantStatusFilter" aria-label="Filter by status"><option value="">All statuses</option><option value="active" ${state.restaurantStatus === 'active' ? 'selected' : ''}>Active</option><option value="suspended" ${state.restaurantStatus === 'suspended' ? 'selected' : ''}>Suspended</option></select><select id="restaurantSortFilter" aria-label="Sort restaurants"><option value="updatedAt" ${state.restaurantSort === 'updatedAt' ? 'selected' : ''}>Recently updated</option><option value="createdAt" ${state.restaurantSort === 'createdAt' ? 'selected' : ''}>Recently created</option><option value="name" ${state.restaurantSort === 'name' ? 'selected' : ''}>Name A–Z</option></select></div>
    ${result.data.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Restaurant</th><th>Status</th><th>Menu items</th><th>Restaurant admin</th><th>Published menu</th><th>Last updated</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>${rows}</tbody></table></div><div class="mobile-records">${cards}</div>${pagination(result.pagination, 'restaurant')}` : emptyBlock('No restaurants found', state.restaurantSearch ? 'Try another search or clear the current filters.' : 'Create your first restaurant to set up its QR menu.')}`;
}

async function renderUsers() {
  const params = new URLSearchParams({ page: String(state.userPage), limit: '10', search: state.userSearch, role: state.userRole, status: state.userStatus, sort: state.userSort, direction: state.userDirection });
  const [result, invitationsResult] = await Promise.all([api(`/api/users?${params}`), api('/api/invitations?limit=50')]);
  const roleLabel = (role) => role === 'SUPER_ADMIN' ? 'Super Admin' : role === 'RESTAURANT_ADMIN' ? 'Restaurant Admin' : 'Menu Editor';
  const rows = result.data.map((user) => `<tr><td><div class="cell-primary">${escapeHTML(user.name)}</div><div class="cell-secondary">${escapeHTML(user.email)}</div></td><td>${user.globalRole ? '<span class="tag">Super Admin</span>' : escapeHTML([...new Set(user.memberships.map((m) => roleLabel(m.role)))].join(', ') || 'No active role')}</td><td>${statusPill(user.isActive, 'Active', 'Suspended')}</td><td>${user.memberships.map((m) => `<div class="cell-secondary">${escapeHTML(m.restaurantName)} · ${escapeHTML(roleLabel(m.role))}${m.isActive ? '' : ' · revoked'}</div>`).join('') || '<span class="cell-secondary">Platform account</span>'}</td><td><div class="table-actions"><button class="button button-secondary button-small" data-action="manage-user-access" data-id="${escapeHTML(user.id)}" type="button">Manage access</button><button class="button button-secondary button-small" data-action="revoke-sessions" data-id="${escapeHTML(user.id)}" type="button">Revoke sessions</button><button class="button button-quiet button-small" data-action="toggle-user" data-id="${escapeHTML(user.id)}" data-active="${user.isActive}" ${user.id === state.user.id ? 'disabled' : ''} type="button">${user.isActive ? 'Suspend' : 'Reactivate'}</button></div></td></tr>`).join('');
  const cards = result.data.map((user) => `<article class="mobile-record"><div class="mobile-record-head"><div><div class="mobile-record-title">${escapeHTML(user.name)}</div><div class="mobile-record-subtitle">${escapeHTML(user.email)}</div></div>${statusPill(user.isActive, 'Active', 'Suspended')}</div><div class="mobile-record-fields"><div class="mobile-record-field"><span>Role</span><strong>${user.globalRole ? 'Super Admin' : escapeHTML([...new Set(user.memberships.map((m) => roleLabel(m.role)))].join(', ') || 'No active role')}</strong></div><div class="mobile-record-field"><span>Restaurant memberships</span><strong>${escapeHTML(user.memberships.map((m) => m.restaurantName).join(', ') || 'Platform account')}</strong></div></div><div class="mobile-record-actions"><button class="button button-secondary button-small" data-action="manage-user-access" data-id="${escapeHTML(user.id)}" type="button">Manage access</button><button class="button button-secondary button-small" data-action="revoke-sessions" data-id="${escapeHTML(user.id)}" type="button">Revoke sessions</button><button class="button button-quiet button-small" data-action="toggle-user" data-id="${escapeHTML(user.id)}" data-active="${user.isActive}" ${user.id === state.user.id ? 'disabled' : ''} type="button">${user.isActive ? 'Suspend' : 'Reactivate'}</button></div></article>`).join('');
  const invitationRows = invitationsResult.data.map((invitation) => `<div class="category-row"><div class="category-row-copy"><strong>${escapeHTML(invitation.email)}</strong><p>${escapeHTML(roleLabel(invitation.role))} · ${escapeHTML(invitation.restaurantName)} · Expires ${escapeHTML(dateText(invitation.expiresAt))}</p></div><div class="card-action-group">${accessPill(invitation.status)}${invitation.status === 'PENDING' ? `<button class="button button-quiet button-small" data-action="revoke-invitation" data-id="${escapeHTML(invitation.id)}" type="button">Revoke</button>` : ''}</div></div>`).join('');
  const invitationSection = `<section class="panel mt-15"><div class="panel-head"><h3 class="section-title">Invitations</h3><span class="muted small">Tokens are never shown here</span></div><div class="panel-body"><div class="category-list">${invitationRows || emptyInline('No invitations found.')}</div></div></section>`;
  return `${pageHeader('Users & access', 'Review platform accounts, assigned restaurant memberships, and account status.',  `<a class="button button-secondary" href="/api/admin/export/users.csv">Export CSV</a><button class="button button-secondary" data-action="assign-membership" type="button">Assign membership</button><button class="button button-primary" data-action="invite-user" type="button">＋ Create invitation</button>`)}
    <div class="toolbar"><form class="toolbar-search" data-submit="user-filter"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg><input type="search" name="search" placeholder="Search by name or email" value="${escapeHTML(state.userSearch)}" aria-label="Search users"></form><select id="userRoleFilter" aria-label="Filter by role"><option value="">All roles</option><option value="SUPER_ADMIN" ${state.userRole === 'SUPER_ADMIN' ? 'selected' : ''}>Super Admin</option><option value="RESTAURANT_ADMIN" ${state.userRole === 'RESTAURANT_ADMIN' ? 'selected' : ''}>Restaurant Admin</option><option value="MENU_EDITOR" ${state.userRole === 'MENU_EDITOR' ? 'selected' : ''}>Menu Editor</option><option value="NONE" ${state.userRole === 'NONE' ? 'selected' : ''}>No membership</option></select><select id="userStatusFilter" aria-label="Filter by status"><option value="">All statuses</option><option value="active" ${state.userStatus === 'active' ? 'selected' : ''}>Active</option><option value="suspended" ${state.userStatus === 'suspended' ? 'selected' : ''}>Suspended</option></select><select id="userSortFilter" aria-label="Sort users"><option value="createdAt" ${state.userSort === 'createdAt' ? 'selected' : ''}>Newest</option><option value="name" ${state.userSort === 'name' ? 'selected' : ''}>Name A–Z</option><option value="lastLoginAt" ${state.userSort === 'lastLoginAt' ? 'selected' : ''}>Last sign-in</option></select></div>
    ${result.data.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Restaurant memberships</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>${rows}</tbody></table></div><div class="mobile-records">${cards}</div>${pagination(result.pagination, 'user')}` : emptyBlock('No users found', 'Try a different search or create an invitation for a new administrator.')}${invitationSection}`;
}

async function renderMenuItems() {
  if (!restaurantId()) return emptyBlock('Select a restaurant', 'Choose an assigned restaurant to manage its menu.');
  const params = new URLSearchParams({ page: String(state.menuPage), limit: '20', search: state.menuSearch, availability: state.menuAvailability });
  const [itemsResult, categoryResult] = await Promise.all([
    api(`/api/restaurants/${encodeURIComponent(restaurantId())}/menu-items?${params}`),
    api(`/api/restaurants/${encodeURIComponent(restaurantId())}/categories`),
  ]);
  state.menuItems = itemsResult.data;
  state.categories = categoryResult.data;
  const categoriesById = new Map(state.categories.map((category) => [category.id, category.name]));
  const itemCards = state.menuItems.map((item) => {
    const imageUrl = safeImageUrl(item.imageUrl);
    const changed = state.restaurant?.publishedAt && item.updatedAt && new Date(item.updatedAt) > new Date(state.restaurant.publishedAt);
    return `<article class="menu-card"><img class="menu-photo" src="${imageUrl ? escapeHTML(imageUrl) : '/assets/dish-placeholder.svg'}" alt="${item.imageUrl ? `Photo of ${escapeHTML(item.name)}` : ''}" loading="lazy"><div class="menu-card-copy"><div class="menu-card-head"><div><h3>${escapeHTML(item.name)}</h3><span class="muted small">${escapeHTML(categoriesById.get(item.categoryId) || 'Uncategorized')}</span></div>${changed ? '<span class="status-pill status-invited">Draft</span>' : ''}</div><p class="menu-card-description">${escapeHTML(item.description || 'No description yet.')}</p><div class="menu-price">${priceText(item.price, item.currency)}</div>${Number.isFinite(item.foodCostPercent) ? `<div class="menu-labels"><span class="tag">Internal food cost ${Number(item.foodCostPercent)}%</span></div>` : ''}${item.dietaryLabels?.length ? `<div class="menu-labels">${item.dietaryLabels.map((label) => `<span class="tag">${escapeHTML(label)}</span>`).join('')}</div>` : ''}<div class="menu-card-footer"><label class="availability-toggle"><input type="checkbox" data-toggle-item="${escapeHTML(item.id)}" ${item.isAvailable ? 'checked' : ''} ${hasPermission('menu.update') ? '' : 'disabled'} aria-label="${item.isAvailable ? 'Mark' : 'Make'} ${escapeHTML(item.name)} ${item.isAvailable ? 'sold out' : 'available'}"><span>${item.isAvailable ? 'Available' : 'Sold out'}</span></label><div class="card-action-group">${hasPermission('menu.update') ? `<button class="button button-quiet button-small" data-action="edit-menu-item" data-id="${escapeHTML(item.id)}" type="button">Edit</button>` : ''}${hasPermission('menu.delete') ? `<button class="button button-quiet button-small" data-action="delete-menu-item" data-id="${escapeHTML(item.id)}" type="button" aria-label="Delete ${escapeHTML(item.name)}">Delete</button>` : ''}</div></div></div></article>`;
  }).join('');
  const publishAction = hasPermission('menu.publish') ? '<button class="button button-primary" data-action="publish-menu" type="button">Publish menu</button>' : '';
  const addAction = hasPermission('menu.create') ? '<button class="button button-secondary" data-action="new-item" type="button">＋ Add item</button>' : '';
  const previewAction = '<button class="button button-secondary" data-page="preview-menu" type="button">Preview changes</button>';
  return `${pageHeader('Menu management', 'Edit dishes, prices, images, and availability. Changes remain drafts until published.', `${previewAction}${publishAction}${addAction}`)}
    <div class="toolbar"><form class="toolbar-search" data-submit="menu-filter"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg><input type="search" name="search" placeholder="Search menu items" value="${escapeHTML(state.menuSearch)}" aria-label="Search menu items"></form><select id="menuAvailabilityFilter" aria-label="Filter menu item availability"><option value="">All availability</option><option value="available" ${state.menuAvailability === 'available' ? 'selected' : ''}>Available</option><option value="sold-out" ${state.menuAvailability === 'sold-out' ? 'selected' : ''}>Sold out</option></select></div>
    ${state.restaurant?.isActive === false ? '<div class="notice notice-warning mb-13">This restaurant is suspended. Draft edits are allowed, but publishing and public menu access are disabled.</div>' : ''}
    ${state.menuItems.length ? `<div class="list-cards">${itemCards}</div>${pagination(itemsResult.pagination, 'menu')}` : emptyBlock('No menu items yet', hasPermission('menu.create') ? 'Add a dish to begin building your menu.' : 'No items match the current filters.')}`;
}

function safeImageUrl(url) {
  if (!url) return '';
  if (/^\/uploads\/[a-zA-Z0-9._-]+$/.test(url)) return url;
  if (/^https:\/\//i.test(url)) return url;
  return '';
}

async function renderCategories() {
  if (!restaurantId()) return emptyBlock('Select a restaurant', 'Choose an assigned restaurant to view categories.');
  const result = await api(`/api/restaurants/${encodeURIComponent(restaurantId())}/categories`);
  state.categories = result.data;
  const canManage = hasPermission('category.manage');
  const rows = result.data.map((category) => `<div class="category-row"><div class="category-row-copy"><strong>${escapeHTML(category.name)}</strong><p>${escapeHTML(category.description || 'No description')} · Sort ${Number(category.sortOrder || 0)} · ${category.isActive ? 'Visible' : 'Hidden'}</p></div><div class="card-action-group">${canManage ? `<button class="button button-secondary button-small" data-action="edit-category" data-id="${escapeHTML(category.id)}" type="button">Edit</button><button class="button button-quiet button-small" data-action="delete-category" data-id="${escapeHTML(category.id)}" type="button">Delete</button>` : ''}</div></div>`).join('');
  return `${pageHeader('Categories', 'Keep your menu easy to browse with clear, well-ordered sections.', canManage ? '<button class="button button-primary" data-action="new-category" type="button">＋ Add category</button>' : '')}${result.data.length ? `<div class="category-list">${rows}</div>` : emptyBlock('No categories yet', canManage ? 'Create a category to organize your menu items.' : 'This restaurant has not created any categories.')}`;
}

async function renderMenuEditors() {
  if (!canManageEditors()) return emptyBlock('Menu Editor management is unavailable', 'A Super Admin must enable this permission for the restaurant.');
  const [result, invitationsResult] = await Promise.all([api(`/api/restaurants/${encodeURIComponent(restaurantId())}/memberships`), api(`/api/invitations?restaurantId=${encodeURIComponent(restaurantId())}&limit=50`)]);
  const rows = result.data.map((entry) => `<tr><td><div class="cell-primary">${escapeHTML(entry.user.name)}</div><div class="cell-secondary">${escapeHTML(entry.user.email)}</div></td><td>${escapeHTML(entry.role.replaceAll('_', ' '))}</td><td>${statusPill(entry.isActive, 'Active', 'Revoked')}</td><td>${entry.permissions.map((permission) => `<span class="tag">${escapeHTML(permission)}</span>`).join(' ') || '<span class="cell-secondary">No permissions</span>'}</td><td><div class="table-actions">${entry.role === 'MENU_EDITOR' ? `<button class="button button-secondary button-small" data-action="edit-editor-permissions" data-id="${escapeHTML(entry.id)}" type="button">Permissions</button><button class="button button-quiet button-small" data-action="toggle-membership" data-id="${escapeHTML(entry.id)}" data-active="${entry.isActive}" type="button">${entry.isActive ? 'Deactivate' : 'Reactivate'}</button><button class="button button-quiet button-small" data-action="revoke-membership" data-id="${escapeHTML(entry.id)}" type="button">Revoke</button>` : '<span class="muted small">Managed by Super Admin</span>'}</div></td></tr>`).join('');
  const cards = result.data.map((entry) => `<article class="editor-card"><div class="mobile-record-head"><div><h3>${escapeHTML(entry.user.name)}</h3><div class="mobile-record-subtitle">${escapeHTML(entry.user.email)}</div></div>${statusPill(entry.isActive, 'Active', 'Revoked')}</div><div class="mobile-record-fields"><div class="mobile-record-field"><span>Role</span><strong>${escapeHTML(entry.role.replaceAll('_', ' '))}</strong></div><div class="mobile-record-field"><span>Permissions</span><strong>${escapeHTML(entry.permissions.join(', ') || 'None')}</strong></div></div><div class="card-actions">${entry.role === 'MENU_EDITOR' ? `<button class="button button-secondary button-small" data-action="edit-editor-permissions" data-id="${escapeHTML(entry.id)}" type="button">Permissions</button><button class="button button-quiet button-small" data-action="toggle-membership" data-id="${escapeHTML(entry.id)}" data-active="${entry.isActive}" type="button">${entry.isActive ? 'Deactivate' : 'Reactivate'}</button><button class="button button-quiet button-small" data-action="revoke-membership" data-id="${escapeHTML(entry.id)}" type="button">Revoke</button>` : ''}</div></article>`).join('');
  const invitationRows = invitationsResult.data.map((invitation) => `<div class="category-row"><div class="category-row-copy"><strong>${escapeHTML(invitation.email)}</strong><p>${escapeHTML(invitation.status)} · Expires ${escapeHTML(dateText(invitation.expiresAt))}</p></div><div class="card-action-group">${accessPill(invitation.status)}${invitation.status === 'PENDING' ? `<button class="button button-quiet button-small" data-action="revoke-invitation" data-id="${escapeHTML(invitation.id)}" type="button">Revoke</button>` : ''}</div></div>`).join('');
  const invitationPanel = `<section class="panel mt-15"><div class="panel-head"><h3 class="section-title">Invitations</h3><span class="muted small">One-time links are not shown here</span></div><div class="panel-body"><div class="category-list">${invitationRows || emptyInline('No invitations for this restaurant.')}</div></div></section>`;
  return `${pageHeader('Menu Editors', 'Invite people to update menu content and grant only the actions they need.',  '<button class="button button-primary" data-action="invite-editor" type="button">＋ Invite Menu Editor</button>')}
    <div class="notice mb-14">Publishing permission is separate. Editors can publish only when <strong>menu.publish</strong> is explicitly granted.</div>
    ${result.data.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Permissions</th><th></th></tr></thead><tbody>${rows}</tbody></table></div><div class="mobile-records">${cards}</div>` : emptyBlock('No Menu Editors assigned', 'Invite a Menu Editor to collaborate on this restaurant’s menu.')}${invitationPanel}`;
}

async function renderQrCodes() {
  const result = await api(`/api/restaurants/${encodeURIComponent(restaurantId())}/qr`);
  return `${pageHeader('QR codes', 'Share the customer-facing menu with a downloadable, print-ready QR code.')}
    <section class="panel panel-pad"><div class="qr-panel"><div class="qr-preview"><img src="${escapeHTML(result.qrDataUrl)}" alt="QR code for ${escapeHTML(result.restaurantName)} menu"></div><div><p class="eyebrow">CUSTOMER MENU</p><h3 class="heading-qr">${escapeHTML(result.restaurantName)}</h3><p class="muted small qr-description">This code points to the currently published customer menu. Changes appear after a Restaurant Admin or authorized Menu Editor publishes them.</p><label class="field"><span>Public menu URL</span><div class="qr-link-box"><input id="publicMenuUrl" value="${escapeHTML(result.publicUrl)}" readonly aria-label="Public menu URL"><button class="button button-secondary" data-action="copy-url" type="button">Copy URL</button></div></label><div class="page-actions mt-16"><a class="button button-primary" href="${escapeHTML(result.qrDataUrl)}" download="${escapeHTML(state.restaurant?.slug || 'restaurant')}-menu-qr.png">Download QR PNG</a><a class="button button-secondary" href="${escapeHTML(result.publicUrl)}" target="_blank" rel="noopener">Open menu ↗</a></div></div></div></section>`;
}

async function renderRestaurantSettings() {
  const response = await api(`/api/restaurants/${encodeURIComponent(restaurantId())}`);
  const restaurant = response.restaurant;
  state.restaurant = restaurant;
  const superUser = isSuperAdmin();
  return `${pageHeader('Restaurant settings', 'Update the details and visual identity customers see on your public menu.')}
    <section class="panel"><form id="restaurantSettingsForm" class="page-form" data-submit="restaurant-settings">
      <div class="form-grid">
        <div class="field"><label for="restaurantName">Restaurant name</label><input id="restaurantName" name="name" maxlength="160" required value="${escapeHTML(restaurant.name)}"></div>
        <div class="field"><label for="restaurantSlug">Public slug</label><input id="restaurantSlug" value="${escapeHTML(restaurant.slug)}" disabled><span class="field-help">Slug is set at creation to keep QR codes stable.</span></div>
        <div class="field field-full"><label for="restaurantDescription">Description</label><textarea id="restaurantDescription" name="description" maxlength="2000" placeholder="A short introduction shown on your menu">${escapeHTML(restaurant.description)}</textarea></div>
        <div class="field"><label for="restaurantPhone">Contact phone</label><input id="restaurantPhone" name="phone" type="tel" inputmode="tel" maxlength="40" value="${escapeHTML(restaurant.contact?.phone || '')}"></div>
        <div class="field"><label for="restaurantEmail">Contact email</label><input id="restaurantEmail" name="email" type="email" inputmode="email" maxlength="254" value="${escapeHTML(restaurant.contact?.email || '')}"></div>
        <div class="field"><label for="restaurantWebsite">Website</label><input id="restaurantWebsite" name="website" type="url" inputmode="url" placeholder="https://example.com" value="${escapeHTML(restaurant.contact?.website || '')}"></div>
        <div class="field"><label for="restaurantAddress">Address</label><input id="restaurantAddress" name="address" maxlength="500" value="${escapeHTML(restaurant.contact?.address || '')}"></div>
        <div class="field"><label for="restaurantLogo">Logo URL</label><input id="restaurantLogo" name="logoUrl" type="text" inputmode="url" value="${escapeHTML(restaurant.logoUrl || '')}" placeholder="https://…"></div>
        <div class="field"><label for="restaurantLogoFile">Upload logo</label><input id="restaurantLogoFile" name="logoFile" type="file" accept="image/png,image/jpeg,image/webp"><span class="field-help">JPEG, PNG, or WebP · max 5 MB</span></div>
        <div class="field"><label for="restaurantCover">Cover image URL</label><input id="restaurantCover" name="coverImageUrl" type="text" inputmode="url" value="${escapeHTML(restaurant.coverImageUrl || '')}" placeholder="https://…"></div>
        <div class="field"><label for="restaurantCoverFile">Upload cover</label><input id="restaurantCoverFile" name="coverFile" type="file" accept="image/png,image/jpeg,image/webp"><span class="field-help">JPEG, PNG, or WebP · max 5 MB</span></div>
        ${superUser ? `<div class="field field-full"><div class="check-row"><input id="menuEditorManagementEnabled" type="checkbox" name="menuEditorManagementEnabled" ${restaurant.menuEditorManagementEnabled ? 'checked' : ''}><label for="menuEditorManagementEnabled">Allow Restaurant Admins to manage Menu Editor accounts</label></div></div>` : ''}
      </div>
      <div class="dialog-error" id="settingsError" role="alert"></div>
      <div class="page-actions mt-18"><button class="button button-primary" type="submit">Save restaurant settings</button><span class="muted small">Updated ${escapeHTML(dateText(restaurant.updatedAt))}</span></div>
    </form></section>`;
}

async function renderPlatformSettings() {
  const response = await api('/api/platform/settings');
  const settings = response.settings;
  return `${pageHeader('Platform settings', 'Configure safe, platform-wide defaults. Billing and subscription management are not enabled in this scaffold.')}
    <section class="panel"><form id="platformSettingsForm" class="page-form" data-submit="platform-settings"><div class="form-grid">
      <div class="field"><label for="supportEmail">Support email</label><input id="supportEmail" name="supportEmail" type="email" inputmode="email" value="${escapeHTML(settings.supportEmail)}"></div>
      <div class="field"><label for="defaultCurrency">Default currency</label><input id="defaultCurrency" name="defaultCurrency" maxlength="3" value="${escapeHTML(settings.defaultCurrency)}" autocapitalize="characters"></div>
      <div class="field"><label for="timezone">Timezone</label><input id="timezone" name="timezone" value="${escapeHTML(settings.timezone)}" placeholder="Asia/Manila"></div>
      <div class="field"><label>Saved</label><div class="notice">Last updated ${escapeHTML(dateText(settings.updatedAt))}</div></div>
      </div><div class="dialog-error" id="settingsError" role="alert"></div><div class="page-actions mt-18"><button class="button button-primary" type="submit">Save platform settings</button></div></form></section>
      <section class="panel panel-pad mt-14"><h3 class="section-title">Security posture</h3><p class="muted small zero-margin">Role claims are loaded from the database on each request. Sessions are opaque, server-stored, HTTP-only cookies. Invitation secrets are hashed at rest and expire automatically.</p></section>`;
}

async function renderActivity() {
  const params = new URLSearchParams({ page: String(state.activityPage), limit: '20' });
  if (!isSuperAdmin()) params.set('restaurantId', restaurantId());
  if (state.activityAction) params.set('action', state.activityAction);
  const result = await api(`/api/audit-events?${params}`);
  const rows = result.data.map((event) => `<tr><td><div class="cell-primary">${escapeHTML(event.action.replaceAll('_', ' '))}</div><div class="cell-secondary">${escapeHTML(event.changes?.fields?.join(', ') || event.targetEntityType || '')}</div></td><td>${escapeHTML(event.actorUserId || 'System')}</td><td>${escapeHTML(event.restaurantId || 'Platform')}</td><td>${escapeHTML(event.targetEntityType)} · ${escapeHTML(event.targetEntityId)}</td><td>${escapeHTML(dateText(event.createdAt))}</td></tr>`).join('');
  const cards = result.data.map((event) => `<article class="mobile-record"><div class="mobile-record-head"><div><div class="mobile-record-title">${escapeHTML(event.action.replaceAll('_', ' '))}</div><div class="mobile-record-subtitle">${escapeHTML(dateText(event.createdAt))}</div></div><span class="tag">${escapeHTML(event.targetEntityType)}</span></div><div class="mobile-record-fields"><div class="mobile-record-field"><span>Actor ID</span><strong>${escapeHTML(event.actorUserId || 'System')}</strong></div><div class="mobile-record-field"><span>Target</span><strong>${escapeHTML(event.targetEntityId)}</strong></div></div></article>`).join('');
  const actionOptions = ['RESTAURANT_CREATED','RESTAURANT_SUSPENDED','USER_INVITED','USER_SUSPENDED','MEMBERSHIP_UPDATED','MENU_ITEM_CREATED','MENU_ITEM_UPDATED','MENU_PRICE_CHANGED','MENU_AVAILABILITY_CHANGED','MENU_PUBLISHED'];
  return `${pageHeader('Activity logs', 'Server-generated records of sensitive administrative and menu operations.')}
    <div class="toolbar"><label class="sr-only" for="activityActionFilter">Filter activity</label><select id="activityActionFilter"><option value="">All actions</option>${actionOptions.map((action) => `<option value="${action}" ${state.activityAction === action ? 'selected' : ''}>${escapeHTML(action.replaceAll('_', ' '))}</option>`).join('')}</select></div>
    ${result.data.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Action</th><th>Actor</th><th>Restaurant</th><th>Target</th><th>Timestamp</th></tr></thead><tbody>${rows}</tbody></table></div><div class="mobile-records">${cards}</div>${pagination(result.pagination, 'activity')}` : emptyBlock('No activity found', 'Administrative events will appear here when changes are made.')}`;
}

async function renderPreview() {
  if (!restaurantId()) return emptyBlock('No restaurant selected', 'Select a restaurant to preview its menu.');
  return `${pageHeader('Preview menu', 'Review the current saved menu draft before publishing. This private preview is not cached on customer devices.', '<button class="button button-primary" data-action="open-draft-preview" type="button">Open private preview ↗</button>')}
    <div class="notice">Your public QR code continues to show the last published snapshot. Draft changes become public only after a permitted user publishes them.</div>
    <div class="panel panel-pad mt-15"><h3 class="section-title">Publication status</h3><p class="muted small">Published version: <strong>v${Number(state.restaurant?.menuVersion || 0)}</strong><br>Last published: <strong>${escapeHTML(dateText(state.restaurant?.publishedAt))}</strong></p>${hasPermission('menu.publish') ? '<button class="button button-primary" data-action="publish-menu" type="button">Publish this draft</button>' : '<p class="muted small">You do not have permission to publish. Ask a Restaurant Admin to grant menu.publish.</p>'}</div>`;
}

function renderProfile() {
  return `${pageHeader('Profile & account', 'Your signed-in administrative identity and account status.')}
    <section class="panel panel-pad"><div class="side-user profile-intro"><div class="avatar avatar-large">${escapeHTML(initials(state.user.name))}</div><div class="side-user-copy"><strong class="type-15">${escapeHTML(state.user.name)}</strong><span class="type-12">${escapeHTML(state.user.email)}</span></div></div><div class="form-grid"><div class="field"><label>Administrative role</label><div>${escapeHTML(isSuperAdmin() ? 'Super Admin' : getActiveMembership()?.role === 'RESTAURANT_ADMIN' ? 'Restaurant Admin' : 'Menu Editor')}</div></div><div class="field"><label>Account status</label><div>${statusPill(state.user.isActive)}</div></div><div class="field"><label>Last sign-in</label><div>${escapeHTML(dateText(state.user.lastLoginAt))}</div></div><div class="field"><label>Member since</label><div>${escapeHTML(dateText(state.user.createdAt))}</div></div></div><div class="notice mt-19">Password changes and account recovery are not configured in this scaffold. Contact your Super Admin through your organization’s verified channel.</div><button class="button button-secondary mt-16" type="button" id="signOutFromProfile">Sign out</button></section>`;
}

function pagination(meta, kind) {
  if (!meta || meta.pages <= 1) return `<div class="pagination"><span>${Number(meta?.total || 0)} records</span></div>`;
  const page = Number(meta.page), pages = Number(meta.pages);
  return `<div class="pagination"><span>Page ${page} of ${pages} · ${Number(meta.total)} records</span><div class="pagination-buttons"><button class="button button-secondary button-small" data-action="page-prev" data-kind="${kind}" ${page <= 1 ? 'disabled' : ''} type="button">Previous</button><button class="button button-secondary button-small" data-action="page-next" data-kind="${kind}" ${page >= pages ? 'disabled' : ''} type="button">Next</button></div></div>`;
}

function showDialog(title, subtitle, body, submitLabel, onSubmit) {
  const dialog = $('#appDialog');
  $('#dialogTitle').textContent = title;
  $('#dialogSubtitle').textContent = subtitle || '';
  $('#dialogBody').innerHTML = body;
  $('#dialogError').textContent = '';
  state.dialogSubmit = onSubmit || null;
  $('#dialogFooter').innerHTML = onSubmit
    ? `<button type="button" class="button button-secondary" id="dialogCancel">Cancel</button><button type="submit" class="button button-primary" id="dialogSubmitButton">${escapeHTML(submitLabel || 'Save')}</button>`
    : `<button type="button" class="button button-primary" id="dialogCancel">Done</button>`;
  if (!dialog.open) dialog.showModal();
  setTimeout(() => $('input:not([type="hidden"]),select,textarea,button', dialog)?.focus(), 0);
}

async function openRestaurantDialog(id = null) {
  const existing = id ? await api(`/api/restaurants/${encodeURIComponent(id)}`) : null;
  const restaurant = existing?.restaurant;
  const body = `<div class="form-grid"><div class="field field-full"><label for="rName">Restaurant name</label><input id="rName" name="name" required maxlength="160" value="${escapeHTML(restaurant?.name || '')}"></div>${!restaurant ? `<div class="field field-full"><label for="rSlug">Public URL slug</label><input id="rSlug" name="slug" required maxlength="80" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="e.g. cafe-mabuhay"><span class="field-help">Lowercase letters, numbers, and hyphens.</span></div>` : ''}<div class="field field-full"><label for="rDescription">Description</label><textarea id="rDescription" name="description" maxlength="2000">${escapeHTML(restaurant?.description || '')}</textarea></div>${isSuperAdmin() ? `<div class="field field-full"><div class="check-row"><input id="rEditorManagement" name="menuEditorManagementEnabled" type="checkbox" ${restaurant?.menuEditorManagementEnabled ? 'checked' : ''}><label for="rEditorManagement">Allow Restaurant Admins to manage Menu Editors</label></div></div>` : ''}</div>`;
  showDialog(restaurant ? 'Edit restaurant' : 'Create restaurant', restaurant ? 'Update the details shown in the platform.' : 'Create a restaurant workspace. You can invite its administrator next.', body, restaurant ? 'Save changes' : 'Create restaurant', async (form) => {
    const formData = new FormData(form);
    const payload = { name: String(formData.get('name') || '').trim(), description: String(formData.get('description') || '').trim() };
    if (!restaurant) payload.slug = String(formData.get('slug') || '').trim();
    if (isSuperAdmin()) payload.menuEditorManagementEnabled = Boolean(formData.get('menuEditorManagementEnabled'));
    if (restaurant) await api(`/api/restaurants/${encodeURIComponent(id)}`, { method: 'PATCH', body: payload });
    else await api('/api/restaurants', { method: 'POST', body: payload });
    $('#appDialog').close();
    toast(restaurant ? 'Restaurant updated.' : 'Restaurant created.');
    await refreshRestaurant();
    await renderPage(state.page);
  });
}

async function openInviteDialog(restaurant = null, forcedRole = null) {
  let availableRestaurants = [];
  if (isSuperAdmin()) availableRestaurants = (await api('/api/restaurants?limit=100')).data;
  else availableRestaurants = state.memberships.map((membership) => ({ id: membership.restaurantId, name: membership.restaurantName, menuEditorManagementEnabled: state.restaurant?.menuEditorManagementEnabled }));
  const selectedRestaurantId = restaurant || state.selectedRestaurantId || availableRestaurants[0]?.id;
  const roleOptions = isSuperAdmin() && !forcedRole ? `<div class="field"><label for="inviteRole">Role</label><select id="inviteRole" name="role"><option value="RESTAURANT_ADMIN">Restaurant Admin</option><option value="MENU_EDITOR">Menu Editor</option></select></div>` : `<input type="hidden" name="role" value="${escapeHTML(forcedRole || 'MENU_EDITOR')}"><div class="field"><label>Role</label><div>${escapeHTML((forcedRole || 'MENU_EDITOR').replaceAll('_', ' '))}</div></div>`;
  const restaurantSelect = isSuperAdmin() ? `<div class="field"><label for="inviteRestaurant">Restaurant</label><select id="inviteRestaurant" name="restaurantId" required>${availableRestaurants.map((item) => `<option value="${escapeHTML(item.id)}" ${item.id === selectedRestaurantId ? 'selected' : ''}>${escapeHTML(item.name)}</option>`).join('')}</select></div>` : `<input type="hidden" name="restaurantId" value="${escapeHTML(selectedRestaurantId)}"><div class="field"><label>Restaurant</label><div>${escapeHTML(state.restaurant?.name || availableRestaurants[0]?.name || '')}</div></div>`;
  const body = `<div class="form-grid"><div class="field field-full"><label for="inviteEmail">Email address</label><input id="inviteEmail" name="email" type="email" inputmode="email" autocomplete="email" required maxlength="254" placeholder="editor@example.com"></div>${restaurantSelect}${roleOptions}<div class="field field-full" id="permissionField"><label>Menu Editor permissions</label><div class="check-row"><input id="permRead" name="permissions" type="checkbox" value="menu.read" checked><label for="permRead">View menu content</label></div><div class="check-row"><input id="permCreate" name="permissions" type="checkbox" value="menu.create" checked><label for="permCreate">Create menu items</label></div><div class="check-row"><input id="permUpdate" name="permissions" type="checkbox" value="menu.update" checked><label for="permUpdate">Edit menu items and upload photos</label></div><div class="check-row"><input id="permDelete" name="permissions" type="checkbox" value="menu.delete"><label for="permDelete">Delete menu items</label></div><div class="check-row"><input id="permCategory" name="permissions" type="checkbox" value="category.manage"><label for="permCategory">Manage categories</label></div><div class="check-row"><input id="permPublish" name="permissions" type="checkbox" value="menu.publish"><label for="permPublish">Publish menu changes</label></div></div></div><div class="notice notice-warning mt-14">Invitation links are single-use and expire. This scaffold returns the link once for secure manual delivery; do not paste it into public channels.</div>`;
  const role = forcedRole || (isSuperAdmin() ? 'RESTAURANT_ADMIN' : 'MENU_EDITOR');
  showDialog('Create invitation', 'The invited person will set their own credentials.', body, 'Create invitation link', async (form) => {
    const formData = new FormData(form);
    const inviteRole = forcedRole || (isSuperAdmin() ? String(formData.get('role')) : 'MENU_EDITOR');
    const payload = { email: String(formData.get('email') || '').trim(), role: inviteRole, restaurantId: String(formData.get('restaurantId') || '') };
    if (inviteRole === 'MENU_EDITOR') payload.permissions = formData.getAll('permissions').map(String);
    const result = await api('/api/invitations', { method: 'POST', body: payload });
    $('#dialogTitle').textContent = 'Invitation ready';
    $('#dialogSubtitle').textContent = `Send this one-time link to ${result.invitation.email}.`;
    $('#dialogBody').innerHTML = `<div class="notice">The link is shown only once. It expires ${escapeHTML(dateText(result.invitation.expiresAt))}.</div><div class="field mt-15"><label for="oneTimeInviteUrl">Private invitation link</label><div class="qr-link-box"><input id="oneTimeInviteUrl" value="${escapeHTML(result.inviteUrl)}" readonly><button class="button button-secondary" data-action="copy-invite" type="button">Copy</button></div></div>`;
    state.dialogSubmit = null;
    $('#dialogFooter').innerHTML = '<button type="button" class="button button-primary" id="dialogCancel">Done</button>';
    await renderPage(state.page);
  });
  const roleSelect = $('#inviteRole');
  if (roleSelect) {
    const permissionField = $('#permissionField');
    const syncPermissionField = () => { permissionField.hidden = roleSelect.value !== 'MENU_EDITOR'; };
    roleSelect.addEventListener('change', syncPermissionField);
    syncPermissionField();
  }
}

async function openMembershipAssignmentDialog(prefilledUserId = null) {
  const [usersResult, restaurantsResult] = await Promise.all([
    api('/api/users?limit=100&status=active'),
    api('/api/restaurants?limit=100'),
  ]);
  const availableUsers = usersResult.data.filter((user) => !user.globalRole);
  const availableRestaurants = restaurantsResult.data;
  if (!availableUsers.length || !availableRestaurants.length) {
    showDialog('Assign membership', 'Add an account and a restaurant before assigning access.', '<div class="notice notice-warning">No eligible users or restaurants are available.</div>', null, null);
    return;
  }
  const body = `<div class="form-grid"><div class="field field-full"><label for="membershipUser">User account</label><select id="membershipUser" name="userId" required>${availableUsers.map((user) => `<option value="${escapeHTML(user.id)}" ${user.id === prefilledUserId ? 'selected' : ''}>${escapeHTML(user.name)} · ${escapeHTML(user.email)}</option>`).join('')}</select></div><div class="field"><label for="membershipRestaurant">Restaurant</label><select id="membershipRestaurant" name="restaurantId" required>${availableRestaurants.map((restaurant) => `<option value="${escapeHTML(restaurant.id)}">${escapeHTML(restaurant.name)}</option>`).join('')}</select></div><div class="field"><label for="membershipRole">Role</label><select id="membershipRole" name="role"><option value="RESTAURANT_ADMIN">Restaurant Admin</option><option value="MENU_EDITOR">Menu Editor</option></select></div><div class="field field-full" id="assignmentPermissions"><label>Menu Editor permissions</label><div class="check-row"><input type="checkbox" name="permissions" value="menu.read" id="assignRead" checked><label for="assignRead">View menu content</label></div><div class="check-row"><input type="checkbox" name="permissions" value="menu.create" id="assignCreate" checked><label for="assignCreate">Create menu items</label></div><div class="check-row"><input type="checkbox" name="permissions" value="menu.update" id="assignUpdate" checked><label for="assignUpdate">Edit items, prices, and photos</label></div><div class="check-row"><input type="checkbox" name="permissions" value="menu.delete" id="assignDelete"><label for="assignDelete">Delete menu items</label></div><div class="check-row"><input type="checkbox" name="permissions" value="category.manage" id="assignCategory"><label for="assignCategory">Manage categories</label></div><div class="check-row"><input type="checkbox" name="permissions" value="menu.publish" id="assignPublish"><label for="assignPublish">Publish menu changes</label></div></div></div>`;
  showDialog('Assign restaurant membership', 'This action does not grant platform-wide Super Admin privileges.', body, 'Assign access', async (form) => {
    const fd = new FormData(form);
    const role = String(fd.get('role'));
    const payload = { userId: String(fd.get('userId')), role };
    if (role === 'MENU_EDITOR') payload.permissions = fd.getAll('permissions').map(String);
    await api(`/api/restaurants/${encodeURIComponent(String(fd.get('restaurantId')))}/memberships`, { method: 'POST', body: payload });
    $('#appDialog').close();
    toast('Restaurant membership assigned.');
    await renderPage('users');
  });
  $('#membershipRole').addEventListener('change', () => { $('#assignmentPermissions').hidden = $('#membershipRole').value !== 'MENU_EDITOR'; });
  $('#assignmentPermissions').hidden = $('#membershipRole').value !== 'MENU_EDITOR';
}

async function openUserAccess(userId) {
  const result = await api(`/api/users/${encodeURIComponent(userId)}`);
  const user = result.user;
  const memberships = user.memberships || [];
  const rows = memberships.length ? memberships.map((membership) => `<div class="category-row"><div class="category-row-copy"><strong>${escapeHTML(membership.restaurantName)}</strong><p>${escapeHTML(membership.role.replaceAll('_', ' '))} · ${membership.permissions.map(escapeHTML).join(', ') || 'No menu permissions'}</p></div><div class="card-action-group">${statusPill(membership.isActive, 'Active', 'Revoked')}<button class="button button-secondary button-small" data-action="edit-global-membership" data-id="${escapeHTML(membership.id)}" data-restaurant-id="${escapeHTML(membership.restaurantId)}" type="button">Edit</button>${membership.isActive ? `<button class="button button-quiet button-small" data-action="revoke-global-membership" data-id="${escapeHTML(membership.id)}" data-restaurant-id="${escapeHTML(membership.restaurantId)}" data-user-id="${escapeHTML(userId)}" type="button">Revoke</button>` : ''}</div></div>`).join('') : '<div class="empty-state"><strong>No restaurant memberships</strong><p>Assign this account to a restaurant to grant scoped access.</p></div>';
  showDialog('Manage user access', `${user.name} · ${user.email}`, `<div class="category-list">${rows}</div><button type="button" class="button button-secondary mt-14" data-action="assign-user-membership" data-id="${escapeHTML(userId)}">＋ Assign to a restaurant</button>`, null, null);
}

async function openGlobalMembershipEditor(restaurantIdValue, membershipId) {
  const result = await api(`/api/restaurants/${encodeURIComponent(restaurantIdValue)}/memberships`);
  const membership = result.data.find((entry) => entry.id === membershipId);
  if (!membership) throw new Error('Membership not found.');
  const permissions = ['menu.read','menu.create','menu.update','menu.delete','category.manage','menu.publish'];
  const checkboxes = permissions.map((permission) => `<div class="check-row"><input type="checkbox" name="permissions" value="${permission}" id="global_${permission.replaceAll('.', '_')}" ${membership.permissions.includes(permission) ? 'checked' : ''}><label for="global_${permission.replaceAll('.', '_')}">${escapeHTML(permission)}</label></div>`).join('');
  const body = `<p class="muted small mb-13">${escapeHTML(membership.user.name)} · ${escapeHTML(membership.user.email)}</p><div class="form-grid"><div class="field"><label for="globalRole">Restaurant role</label><select id="globalRole" name="role"><option value="RESTAURANT_ADMIN" ${membership.role === 'RESTAURANT_ADMIN' ? 'selected' : ''}>Restaurant Admin</option><option value="MENU_EDITOR" ${membership.role === 'MENU_EDITOR' ? 'selected' : ''}>Menu Editor</option></select></div><div class="field"><div class="check-row"><input type="checkbox" id="globalActive" name="isActive" ${membership.isActive ? 'checked' : ''}><label for="globalActive">Membership active</label></div></div><div class="field field-full" id="globalPermissionSet">${checkboxes}</div></div>`;
  showDialog('Edit membership', 'A restaurant membership cannot grant Super Admin privileges.', body, 'Save membership', async (form) => {
    const fd = new FormData(form);
    const role = String(fd.get('role'));
    const payload = { role, isActive: Boolean(fd.get('isActive')) };
    if (role === 'MENU_EDITOR') payload.permissions = fd.getAll('permissions').map(String);
    await api(`/api/restaurants/${encodeURIComponent(restaurantIdValue)}/memberships/${encodeURIComponent(membershipId)}`, { method: 'PATCH', body: payload });
    showDialog('Manage user access', 'Membership updated.', '<div class="notice">Changes take effect immediately on the next protected API request.</div><button type="button" class="button button-secondary mt-14" data-action="return-user-access" data-id="' + escapeHTML(membership.user.id) + '">Return to user access</button>', null, null);
    await renderPage('users');
  });
  $('#globalRole').addEventListener('change', () => { $('#globalPermissionSet').hidden = $('#globalRole').value !== 'MENU_EDITOR'; });
  $('#globalPermissionSet').hidden = $('#globalRole').value !== 'MENU_EDITOR';
}

async function openMenuItemDialog(id = null) {
  const existing = id ? state.menuItems.find((item) => item.id === id) || (await api(`/api/restaurants/${encodeURIComponent(restaurantId())}/menu-items?limit=100`)).data.find((item) => item.id === id) : null;
  const categoryOptions = state.categories.map((category) => `<option value="${escapeHTML(category.id)}" ${category.id === existing?.categoryId ? 'selected' : ''}>${escapeHTML(category.name)}</option>`).join('');
  const body = `<div class="form-grid"><div class="field field-full"><label for="itemName">Dish name</label><input id="itemName" name="name" required maxlength="160" value="${escapeHTML(existing?.name || '')}"></div><div class="field field-full"><label for="itemDescription">Description</label><textarea id="itemDescription" name="description" maxlength="2000" placeholder="Tell guests what makes this dish special">${escapeHTML(existing?.description || '')}</textarea></div><div class="field"><label for="itemPrice">Price (${escapeHTML(existing?.currency || 'PHP')})</label><input id="itemPrice" name="price" type="number" inputmode="decimal" min="0" max="10000000" step="0.01" required value="${existing?.price ?? ''}"></div><div class="field"><label for="itemCategory">Category</label><select id="itemCategory" name="categoryId"><option value="">Uncategorized</option>${categoryOptions}</select></div><div class="field"><label for="itemFoodCostPercent">Food cost target (%)</label><input id="itemFoodCostPercent" name="foodCostPercent" type="number" inputmode="decimal" min="0" max="100" step="0.1" value="${existing?.foodCostPercent ?? ''}"><span class="field-help">Internal only; not shown to guests.</span></div><div class="field field-full"><label for="itemDietary">Dietary labels</label><input id="itemDietary" name="dietaryLabels" placeholder="Vegetarian, contains nuts" value="${escapeHTML((existing?.dietaryLabels || []).join(', '))}"><span class="field-help">Separate labels with commas.</span></div><div class="field"><label for="itemImageFile">Dish photo</label><input id="itemImageFile" name="imageFile" type="file" accept="image/png,image/jpeg,image/webp" capture="environment"><span class="field-help">JPEG, PNG, or WebP · max 5 MB</span></div><div class="field"><label for="itemImageUrl">Image URL</label><input id="itemImageUrl" name="imageUrl" type="text" inputmode="url" placeholder="https://… or upload a photo" value="${escapeHTML(existing?.imageUrl || '')}"></div><div class="field field-full"><div class="check-row"><input id="itemAvailable" name="isAvailable" type="checkbox" ${existing?.isAvailable !== false ? 'checked' : ''}><label for="itemAvailable">Available to order</label></div></div></div>`;
  showDialog(existing ? 'Edit menu item' : 'Add menu item', 'Save as a draft, then preview and publish when ready.', body, existing ? 'Save changes' : 'Add menu item', async (form) => {
    if (!navigator.onLine) throw new Error('Menu editing is unavailable offline. Reconnect before saving.');
    const fd = new FormData(form);
    let imageUrl = String(fd.get('imageUrl') || '').trim();
    const photo = fd.get('imageFile');
    if (photo instanceof File && photo.size > 0) imageUrl = await uploadPhoto(photo);
    const rawPrice = String(fd.get('price') ?? '').trim();
    const rawFoodCost = String(fd.get('foodCostPercent') ?? '').trim();
    const payload = {
      name: String(fd.get('name') || '').trim(),
      description: String(fd.get('description') || '').trim(),
      price: Number(rawPrice),
      currency: existing?.currency || 'PHP',
      foodCostPercent: rawFoodCost ? Number(rawFoodCost) : null,
      categoryId: String(fd.get('categoryId') || ''),
      imageUrl,
      dietaryLabels: String(fd.get('dietaryLabels') || '').split(',').map((value) => value.trim()).filter(Boolean),
      isAvailable: Boolean(fd.get('isAvailable')),
    };
    if (existing) await api(`/api/restaurants/${encodeURIComponent(restaurantId())}/menu-items/${encodeURIComponent(existing.id)}`, { method: 'PATCH', body: payload });
    else await api(`/api/restaurants/${encodeURIComponent(restaurantId())}/menu-items`, { method: 'POST', body: payload });
    $('#appDialog').close();
    toast(existing ? 'Menu item saved as a draft.' : 'Menu item added as a draft.');
    await renderPage('menu-items');
  });
  $('#itemImageFile')?.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const preview = document.createElement('img');
    preview.src = url;
    preview.alt = 'Selected dish photo preview';
    preview.className = 'image-preview';
    const field = event.target.closest('.field');
    field?.append(preview);
  });
}

async function uploadPhoto(file) {
  const form = new FormData();
  form.append('file', file);
  const result = await api(`/api/restaurants/${encodeURIComponent(restaurantId())}/uploads`, { method: 'POST', body: form });
  return result.imageUrl;
}

function openCategoryDialog(id = null) {
  const category = id ? state.categories.find((entry) => entry.id === id) : null;
  const body = `<div class="form-grid"><div class="field field-full"><label for="categoryName">Category name</label><input id="categoryName" name="name" required maxlength="160" value="${escapeHTML(category?.name || '')}"></div><div class="field field-full"><label for="categoryDescription">Description</label><textarea id="categoryDescription" name="description" maxlength="500">${escapeHTML(category?.description || '')}</textarea></div><div class="field"><label for="categoryOrder">Sort order</label><input id="categoryOrder" name="sortOrder" type="number" inputmode="numeric" min="0" max="100000" step="1" value="${Number(category?.sortOrder || 0)}"></div><div class="field"><div class="check-row"><input id="categoryActive" name="isActive" type="checkbox" ${category?.isActive !== false ? 'checked' : ''}><label for="categoryActive">Visible in customer menu</label></div></div></div>`;
  showDialog(category ? 'Edit category' : 'New category', 'Set the name and display order for this section.', body, category ? 'Save category' : 'Create category', async (form) => {
    const fd = new FormData(form);
    const payload = { name: String(fd.get('name') || '').trim(), description: String(fd.get('description') || '').trim(), sortOrder: Number(fd.get('sortOrder') || 0), isActive: Boolean(fd.get('isActive')) };
    if (category) await api(`/api/restaurants/${encodeURIComponent(restaurantId())}/categories/${encodeURIComponent(category.id)}`, { method: 'PATCH', body: payload });
    else await api(`/api/restaurants/${encodeURIComponent(restaurantId())}/categories`, { method: 'POST', body: payload });
    $('#appDialog').close();
    toast(category ? 'Category updated.' : 'Category created.');
    await renderPage('categories');
  });
}

async function openEditorPermissions(id) {
  const result = await api(`/api/restaurants/${encodeURIComponent(restaurantId())}/memberships`);
  const editor = result.data.find((entry) => entry.id === id);
  if (!editor) throw new Error('Menu Editor membership not found.');
  const options = [
    ['menu.read', 'View menu content'], ['menu.create', 'Create menu items'], ['menu.update', 'Edit items, prices, and photos'],
    ['menu.delete', 'Delete menu items'], ['category.manage', 'Manage categories'], ['menu.publish', 'Publish menu changes'],
  ];
  const body = `<p class="muted small mb-13">${escapeHTML(editor.user.name)} · ${escapeHTML(editor.user.email)}</p>${options.map(([permission, label]) => `<div class="check-row"><input type="checkbox" name="permissions" value="${permission}" id="edit_${permission.replaceAll('.', '_')}" ${editor.permissions.includes(permission) ? 'checked' : ''}><label for="edit_${permission.replaceAll('.', '_')}">${escapeHTML(label)}</label></div>`).join('')}`;
  showDialog('Editor permissions', 'Only explicitly checked actions will be allowed by the server.', body, 'Save permissions', async (form) => {
    const permissions = new FormData(form).getAll('permissions').map(String);
    await api(`/api/restaurants/${encodeURIComponent(restaurantId())}/memberships/${encodeURIComponent(id)}`, { method: 'PATCH', body: { permissions } });
    $('#appDialog').close();
    toast('Menu Editor permissions updated.');
    await renderPage('menu-editors');
  });
}

async function saveRestaurantSettings(form) {
  const errorBox = $('#settingsError');
  if (errorBox) errorBox.textContent = '';
  const fd = new FormData(form);
  let logoUrl = String(fd.get('logoUrl') || '').trim();
  let coverImageUrl = String(fd.get('coverImageUrl') || '').trim();
  const logo = fd.get('logoFile'), cover = fd.get('coverFile');
  if (logo instanceof File && logo.size) logoUrl = await uploadPhoto(logo);
  if (cover instanceof File && cover.size) coverImageUrl = await uploadPhoto(cover);
  const contact = { phone: String(fd.get('phone') || '').trim(), email: String(fd.get('email') || '').trim(), website: String(fd.get('website') || '').trim(), address: String(fd.get('address') || '').trim() };
  const payload = { name: String(fd.get('name') || '').trim(), description: String(fd.get('description') || '').trim(), contact, logoUrl, coverImageUrl };
  if (isSuperAdmin()) payload.menuEditorManagementEnabled = Boolean(fd.get('menuEditorManagementEnabled'));
  await api(`/api/restaurants/${encodeURIComponent(restaurantId())}`, { method: 'PATCH', body: payload });
  toast('Restaurant settings saved.');
  await refreshRestaurant();
  await renderPage('restaurant-settings');
}

async function savePlatformSettings(form) {
  const fd = new FormData(form);
  await api('/api/platform/settings', { method: 'PUT', body: { supportEmail: String(fd.get('supportEmail') || '').trim(), defaultCurrency: String(fd.get('defaultCurrency') || '').trim().toUpperCase(), timezone: String(fd.get('timezone') || '').trim() } });
  toast('Platform settings saved.');
  await renderPage('platform-settings');
}

async function performAction(action, element) {
  const id = element.dataset.id;
  switch (action) {
    case 'new-restaurant': return openRestaurantDialog();
    case 'edit-restaurant': return openRestaurantDialog(id);
    case 'toggle-restaurant': {
      const active = element.dataset.active === 'true';
      if (active && !confirm('Suspend this restaurant? Public menu access and publishing will stop. Menu data will be kept. Previously cached offline menus may remain available until customer devices reconnect.')) return;
      await api(`/api/restaurants/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: { isActive: !active } });
      toast(active ? 'Restaurant suspended.' : 'Restaurant reactivated.');
      return renderPage(state.page);
    }
    case 'invite-admin': return openInviteDialog(id, 'RESTAURANT_ADMIN');
    case 'copy-restaurant-url': {
      const { restaurant } = await api(`/api/restaurants/${encodeURIComponent(id)}`);
      await navigator.clipboard.writeText(new URL(`/menu.html?slug=${encodeURIComponent(restaurant.slug)}`, location.origin).href);
      toast('Public restaurant URL copied.');
      return;
    }
    case 'download-restaurant-qr': {
      const qr = await api(`/api/restaurants/${encodeURIComponent(id)}/qr`);
      const link = document.createElement('a');
      link.href = qr.qrDataUrl;
      link.download = `${qr.slug || 'restaurant'}-menu-qr.png`;
      link.click();
      toast('QR code downloaded.');
      return;
    }
    case 'invite-editor': return openInviteDialog(restaurantId(), 'MENU_EDITOR');
    case 'invite-user': return openInviteDialog();
    case 'revoke-invitation': {
      if (!confirm('Revoke this pending invitation? Its one-time link will stop working immediately.')) return;
      await api(`/api/invitations/${encodeURIComponent(id)}/revoke`, { method: 'PATCH', body: {} });
      toast('Invitation revoked.');
      return renderPage(state.page);
    }
    case 'assign-membership': return openMembershipAssignmentDialog();
    case 'manage-user-access': return openUserAccess(id);
    case 'assign-user-membership': return openMembershipAssignmentDialog(id);
    case 'edit-global-membership': return openGlobalMembershipEditor(element.dataset.restaurantId, id);
    case 'return-user-access': return openUserAccess(id);
    case 'revoke-global-membership': {
      if (!confirm('Revoke this user’s membership for the selected restaurant?')) return;
      await api(`/api/restaurants/${encodeURIComponent(element.dataset.restaurantId)}/memberships/${encodeURIComponent(id)}`, { method: 'DELETE' });
      toast('Restaurant membership revoked.');
      return openUserAccess(element.dataset.userId);
    }
    case 'new-item': return openMenuItemDialog();
    case 'edit-menu-item': return openMenuItemDialog(id);
    case 'delete-menu-item': {
      const item = state.menuItems.find((entry) => entry.id === id);
      if (!confirm(`Delete “${item?.name || 'this menu item'}”? This cannot be undone.`)) return;
      await api(`/api/restaurants/${encodeURIComponent(restaurantId())}/menu-items/${encodeURIComponent(id)}`, { method: 'DELETE' });
      toast('Menu item deleted.');
      return renderPage('menu-items');
    }
    case 'publish-menu': {
      if (!navigator.onLine) throw new Error('Publishing requires a network connection.');
      if (!confirm('Publish the current menu draft? Customer menus update the next time they successfully sync online.')) return;
      const result = await api(`/api/restaurants/${encodeURIComponent(restaurantId())}/publish`, { method: 'POST', body: {} });
      toast(`Menu published as version ${result.version}.`);
      await refreshRestaurant();
      return renderPage(state.page);
    }
    case 'new-category': return openCategoryDialog();
    case 'edit-category': return openCategoryDialog(id);
    case 'delete-category': {
      const category = state.categories.find((entry) => entry.id === id);
      if (!confirm(`Delete “${category?.name || 'this category'}”? Menu items will be left uncategorized.`)) return;
      await api(`/api/restaurants/${encodeURIComponent(restaurantId())}/categories/${encodeURIComponent(id)}`, { method: 'DELETE' });
      toast('Category deleted.');
      return renderPage('categories');
    }
    case 'edit-editor-permissions': return openEditorPermissions(id);
    case 'toggle-membership': {
      const active = element.dataset.active === 'true';
      if (active && !confirm('Deactivate this Menu Editor membership? Restaurant access will stop immediately.')) return;
      await api(`/api/restaurants/${encodeURIComponent(restaurantId())}/memberships/${encodeURIComponent(id)}`, { method: 'PATCH', body: { isActive: !active } });
      toast(active ? 'Membership deactivated.' : 'Membership reactivated.');
      return renderPage('menu-editors');
    }
    case 'revoke-membership': {
      if (!confirm('Revoke this Menu Editor’s restaurant membership? Their other restaurant access, if any, will remain unchanged.')) return;
      await api(`/api/restaurants/${encodeURIComponent(restaurantId())}/memberships/${encodeURIComponent(id)}`, { method: 'DELETE' });
      toast('Membership revoked.');
      return renderPage('menu-editors');
    }
    case 'toggle-user': {
      const active = element.dataset.active === 'true';
      if (active && !confirm('Suspend this user and revoke all of their active sessions and pending invitations?')) return;
      await api(`/api/users/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: { isActive: !active } });
      toast(active ? 'User suspended.' : 'User reactivated.');
      return renderPage('users');
    }
    case 'revoke-sessions': {
      if (!confirm('Revoke all active sessions for this account?')) return;
      const result = await api(`/api/users/${encodeURIComponent(id)}/revoke-sessions`, { method: 'POST', body: {} });
      toast(`${result.revokedCount} session(s) revoked.`);
      return;
    }
    case 'copy-url': {
      await navigator.clipboard.writeText($('#publicMenuUrl').value);
      toast('Public menu URL copied.');
      return;
    }
    case 'copy-invite': {
      await navigator.clipboard.writeText($('#oneTimeInviteUrl').value);
      toast('One-time invite link copied. Deliver it securely.');
      return;
    }
    case 'open-draft-preview': return window.open(`/menu.html?preview=${encodeURIComponent(restaurantId())}`, '_blank', 'noopener');
    case 'retry-page': return renderPage(state.page);
    case 'page-prev': return changePage(element.dataset.kind, -1);
    case 'page-next': return changePage(element.dataset.kind, 1);
    default: return;
  }
}

function changePage(kind, direction) {
  const key = kind === 'restaurant' ? 'restaurantPage' : kind === 'user' ? 'userPage' : kind === 'menu' ? 'menuPage' : 'activityPage';
  state[key] = Math.max(1, state[key] + direction);
  return renderPage(state.page);
}

async function signOut() {
  try { await api('/api/auth/logout', { method: 'POST', body: {} }); } catch { /* Clear local navigation even if the network has dropped. */ }
  sessionStorage.removeItem(`publiq:selected:${state.user?.id}`);
  location.replace('/');
}

function openDrawer() {
  if (!matchMedia('(max-width: 720px)').matches) return;
  const sidebar = $('#adminSidebar');
  const backdrop = $('#sidebarBackdrop');
  state.drawerOpen = true;
  sidebar.classList.add('mobile-open');
  sidebar.setAttribute('role', 'dialog');
  sidebar.setAttribute('aria-modal', 'true');
  backdrop.hidden = false;
  requestAnimationFrame(() => backdrop.classList.add('is-visible'));
  document.body.classList.add('drawer-open');
  $('#workspace').inert = true;
  $('#mobileMenuButton').setAttribute('aria-expanded', 'true');
  $('#sidebarClose').hidden = false;
  setTimeout(() => $('#sidebarClose').focus(), 20);
}
function closeDrawer(restoreFocus = false) {
  if (!state.drawerOpen) return;
  state.drawerOpen = false;
  const sidebar = $('#adminSidebar');
  const backdrop = $('#sidebarBackdrop');
  sidebar.classList.remove('mobile-open');
  sidebar.removeAttribute('role');
  sidebar.removeAttribute('aria-modal');
  backdrop.classList.remove('is-visible');
  setTimeout(() => { backdrop.hidden = true; }, 180);
  document.body.classList.remove('drawer-open');
  $('#workspace').inert = false;
  $('#mobileMenuButton').setAttribute('aria-expanded', 'false');
  $('#sidebarClose').hidden = true;
  if (restoreFocus) $('#mobileMenuButton').focus();
}

$('#mobileMenuButton').addEventListener('click', openDrawer);
$('#sidebarClose').addEventListener('click', () => closeDrawer(true));
$('#sidebarBackdrop').addEventListener('click', () => closeDrawer(true));
document.addEventListener('keydown', (event) => {
  if (!state.drawerOpen) return;
  if (event.key === 'Escape') { event.preventDefault(); closeDrawer(true); return; }
  if (event.key !== 'Tab') return;
  const focusable = $$('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])', $('#adminSidebar')).filter((node) => !node.hidden && node.offsetParent !== null);
  if (!focusable.length) return;
  const first = focusable[0], last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});
$('#mobileMenuButton').addEventListener('keydown', (event) => { if (event.key === 'Escape' && state.drawerOpen) closeDrawer(true); });
$('#restaurantSelect').addEventListener('change', async (event) => {
  const selected = event.target.value;
  if (!state.memberships.some((membership) => membership.restaurantId === selected)) return;
  state.selectedRestaurantId = selected;
  sessionStorage.setItem(`publiq:selected:${state.user.id}`, selected);
  state.restaurant = null;
  await refreshRestaurant();
  state.page = 'overview';
  applyShell();
  await renderPage('overview');
});
$('#signOutButton').addEventListener('click', signOut);
$('#pageContent').addEventListener('click', (event) => { if (event.target.id === 'signOutFromProfile') signOut(); });
$('#dialogClose').addEventListener('click', () => $('#appDialog').close());
$('#appDialog').addEventListener('click', (event) => { if (event.target.id === 'dialogCancel') $('#appDialog').close(); });
$('#appDialog').addEventListener('close', () => { state.dialogSubmit = null; });
$('#dialogForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!state.dialogSubmit) return;
  const submit = $('#dialogSubmitButton');
  if (submit) { submit.disabled = true; submit.textContent = 'Saving…'; }
  $('#dialogError').textContent = '';
  try { await state.dialogSubmit(event.currentTarget); }
  catch (error) { $('#dialogError').textContent = error.message; if (submit) { submit.disabled = false; submit.textContent = 'Try again'; } }
});

document.addEventListener('error', (event) => {
  const image = event.target;
  if (image instanceof HTMLImageElement && image.classList.contains('menu-photo') && !image.dataset.fallback) {
    image.dataset.fallback = 'true';
    image.src = '/assets/dish-placeholder.svg';
  }
}, true);

document.addEventListener('click', async (event) => {
  const navButton = event.target.closest('[data-page]');
  if (navButton && !navButton.disabled) {
    const page = navButton.dataset.page;
    if (page === 'profile' || state.nav.some((entry) => entry[0] === page)) await navigate(page);
    $('#userMenu').open = false;
    return;
  }
  const actionButton = event.target.closest('[data-action]');
  if (!actionButton || actionButton.disabled) return;
  try { await performAction(actionButton.dataset.action, actionButton); }
  catch (error) { toast(error.message); }
});

document.addEventListener('change', async (event) => {
  if (event.target.id === 'restaurantStatusFilter') {
    state.restaurantStatus = event.target.value; state.restaurantPage = 1; await renderPage('restaurants');
  } else if (event.target.id === 'restaurantSortFilter') {
    state.restaurantSort = event.target.value; state.restaurantPage = 1; await renderPage('restaurants');
  } else if (event.target.id === 'userSortFilter') {
    state.userSort = event.target.value; state.userPage = 1; await renderPage('users');
  } else if (event.target.id === 'userRoleFilter') {
    state.userRole = event.target.value; state.userPage = 1; await renderPage('users');
  } else if (event.target.id === 'userStatusFilter') {
    state.userStatus = event.target.value; state.userPage = 1; await renderPage('users');
  } else if (event.target.id === 'menuAvailabilityFilter') {
    state.menuAvailability = event.target.value; state.menuPage = 1; await renderPage('menu-items');
  } else if (event.target.id === 'activityActionFilter') {
    state.activityAction = event.target.value; state.activityPage = 1; await renderPage('activity');
  } else if (event.target.matches('[data-toggle-item]')) {
    const itemId = event.target.dataset.toggleItem;
    const value = event.target.checked;
    const item = state.menuItems.find((entry) => entry.id === itemId);
    try {
      if (!navigator.onLine) throw new Error('Availability updates require a network connection.');
      await api(`/api/restaurants/${encodeURIComponent(restaurantId())}/menu-items/${encodeURIComponent(itemId)}`, { method: 'PATCH', body: { isAvailable: value } });
      toast(value ? 'Dish marked available.' : 'Dish marked sold out.');
      await renderPage('menu-items');
    } catch (error) {
      event.target.checked = item?.isAvailable ?? !value;
      toast(error.message);
    }
  }
});

document.addEventListener('submit', async (event) => {
  const form = event.target;
  if (form.matches('[data-submit="restaurant-filter"]')) {
    event.preventDefault(); state.restaurantSearch = String(new FormData(form).get('search') || '').trim(); state.restaurantPage = 1; await renderPage('restaurants');
  } else if (form.matches('[data-submit="user-filter"]')) {
    event.preventDefault(); state.userSearch = String(new FormData(form).get('search') || '').trim(); state.userPage = 1; await renderPage('users');
  } else if (form.matches('[data-submit="menu-filter"]')) {
    event.preventDefault(); state.menuSearch = String(new FormData(form).get('search') || '').trim(); state.menuPage = 1; await renderPage('menu-items');
  } else if (form.matches('[data-submit="restaurant-settings"]')) {
    event.preventDefault();
    try { await saveRestaurantSettings(form); } catch (error) { $('#settingsError').textContent = error.message; }
  } else if (form.matches('[data-submit="platform-settings"]')) {
    event.preventDefault();
    try { await savePlatformSettings(form); } catch (error) { $('#settingsError').textContent = error.message; }
  }
});

function updateOfflineBanner() {
  const banner = $('#adminOfflineBanner');
  if (banner) banner.classList.toggle('is-visible', !navigator.onLine);
}
window.addEventListener('offline', updateOfflineBanner);
window.addEventListener('online', updateOfflineBanner);
updateOfflineBanner();
loadWorkspace();
