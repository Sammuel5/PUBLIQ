const SHELL_CACHE = 'publiq-public-shell-v3';
const MEDIA_CACHE = 'publiq-public-media-v2';
const PUBLIC_SHELL = [
  '/menu.html',
  '/assets/menu.css',
  '/assets/menu.js',
  '/assets/dish-placeholder.svg',
  '/assets/publiq-photo-food.svg',
  '/assets/publiq-photo-frappes.svg',
  '/assets/publiq-photo-iced-coffee.svg',
  '/assets/publiq-photo-hot-coffee.svg',
  '/assets/publiq-photo-iced-noncoffee.svg',
  '/assets/publiq-photo-hot-noncoffee.svg',
  '/assets/publiq-super-club-icon.svg',
  '/assets/publiq-superclub-logo.jpg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(PUBLIC_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => (key.startsWith('publiq-public-') || key.startsWith('mise-public-')) && ![SHELL_CACHE, MEDIA_CACHE].includes(key)).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Authenticated API responses, including all admin endpoints, are never intercepted or cached.
  if (url.pathname.startsWith('/api/')) return;

  if (url.pathname.startsWith('/uploads/')) {
    event.respondWith((async () => {
      const cache = await caches.open(MEDIA_CACHE);
      const cached = await cache.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response.ok && response.type === 'basic') await cache.put(request, response.clone());
        return response;
      } catch { return Response.error(); }
    })());
    return;
  }

  if (PUBLIC_SHELL.includes(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(SHELL_CACHE);
      const cached = await cache.match(request, { ignoreSearch: true });
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) cache.put(request, response.clone());
      return response;
    })());
  }
});
