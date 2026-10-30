import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('admin shell exposes accessible drawer controls and shared responsive shell', async () => {
  const [html, js, css] = await Promise.all([
    read('../public/admin.html'), read('../public/assets/admin.js'), read('../public/assets/app.css'),
  ]);
  assert.match(html, /id="mobileMenuButton"[^>]*aria-controls="adminSidebar"[^>]*aria-expanded="false"/);
  assert.match(html, /id="adminSidebar"[^>]*aria-label="Main navigation"/);
  assert.match(html, /id="sidebarBackdrop"/);
  assert.match(html, /<dialog[^>]*id="appDialog"/);
  assert.match(css, /@media\(max-width:720px\)/);
  assert.match(css, /@media\(max-width:380px\)/);
  assert.match(css, /env\(safe-area-inset/);
  assert.match(css, /\.mobile-records\{display:grid/);
  assert.match(js, /event\.key === 'Escape'/);
  assert.match(js, /focusable\[0\]/);
  assert.match(js, /focusable\[focusable\.length - 1\]/);
  assert.match(js, /\.inert = true/);
  assert.match(js, /\.focus\(\)/);
});

test('PUBLIQ public menu is linked from sign-in and uses a read-only guest snapshot', async () => {
  const [login, app, menu, data] = await Promise.all([
    read('../public/index.html'), read('../src/app.js'), read('../public/assets/menu.js'), read('../src/demo-menus.js'),
  ]);
  assert.match(login, /href="\/menu\.html\?slug=publiq-superclub"/);
  assert.match(app, /getPublicDemoMenu\(req\.params\.slug\)/);
  assert.match(app, /function publicMenuItem\(item\)/);
  assert.match(app, /function adminMenuItem\(item\)/);
  assert.match(menu, /snapshot\.slug === 'publiq-superclub'/);
  assert.match(menu, /menuAnnouncement/);
  assert.match(data, /name: 'PUBLIQ Super Club'/);
  assert.match(data, /PUBLIQ_INTERNAL_FOOD_COST_NOTES/);
});

test('public offline storage is branded, migrates legacy snapshots, and excludes admin APIs', async () => {
  const [menu, worker, app] = await Promise.all([
    read('../public/assets/menu.js'), read('../public/sw.js'), read('../src/app.js'),
  ]);
  assert.match(menu, /MENU_DB_NAME = 'publiq-super-club-menu-cache'/);
  assert.match(menu, /LEGACY_MENU_DB_NAME = 'mise-public-menus'/);
  assert.match(menu, /publiq-photo-food\.svg/);
  assert.match(menu, /\/api\/public\/menus\//);
  assert.match(menu, /\/api\/restaurants\/\$\{encodeURIComponent\(previewId\)\}\/preview/);
  assert.match(worker, /publiq-public-shell-v3/);
  assert.match(worker, /if \(url\.pathname\.startsWith\('\/api\/'\)\) return/);
  assert.match(worker, /MEDIA_CACHE/);
  assert.match(app, /Cache-Control', 'no-store, private'/);
});

test('login, invitation, admin, and web-app metadata all use the PUBLIQ Super Club brand', async () => {
  const [login, invitation, admin, menu, manifest, css] = await Promise.all([
    read('../public/index.html'), read('../public/accept-invite.html'), read('../public/admin.html'),
    read('../public/menu.html'), read('../public/manifest.webmanifest'), read('../public/assets/app.css'),
  ]);
  for (const page of [login, invitation, admin, menu, manifest]) {
    assert.match(page, /PUBLIQ Super Club/);
    assert.doesNotMatch(page, /Mise/i);
  }
  assert.match(login, /One clear workspace for PUBLIQ Super Club/);
  assert.match(admin, /publiq-super-club-icon\.svg/);
  assert.match(manifest, /publiq-super-club-icon\.svg/);
  assert.match(css, /--brand:#181715/);
});
