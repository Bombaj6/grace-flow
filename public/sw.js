// Grace Flow Service Worker — Full Offline Caching Engine
const CACHE_NAME = 'grace-flow-cache-v1';
const CORE_ASSETS = [
  '/',
  '/stage',
  '/stats',
  '/css/style.css',
  '/js/app.js',
  '/js/stage.js',
  '/js/telemetry.js',
  '/manifest.json',
  '/assets/icon.png',
  '/assets/icon.jpg'
];

// Install: Cache all core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS).catch((err) => {
        console.warn('PWA: Some assets could not be pre-cached', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: Serve from cache when offline, update cache when online
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bypass Server-Sent Events and POST API requests completely
  if (url.pathname.startsWith('/api/events') || event.request.method !== 'GET') {
    return;
  }

  // Network-first for dynamic API calls with offline fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request);
      })
    );
    return;
  }

  // Stale-while-revalidate for app pages and static assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline and not in cache, fallback to main page if navigating
          if (event.request.mode === 'navigate') {
            if (url.pathname.includes('/stage')) {
              return caches.match('/stage');
            }
            return caches.match('/');
          }
        });

      return cachedResponse || fetchPromise;
    })
  );
});
