const CACHE_NAME = 'beatty-v1.0.6';
const urlsToCache = [
  './',
  './index.html',
  './main.js',
  './AppState.js',
  './audio.js',
  './audio-analyzer.js',
  './audio-worklet.js',
  './SoundGL.js',
  './VisualGL.js',
  './editor.js',
  './shader-templates.js',
  './StatusManager.js',
  './storage.js',
  './consts.js',
  './utils.js',
  './styles.css',
  './manifest.json'
];

// Install event - cache resources and skip waiting
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching resources');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[SW] Skip waiting');
        return self.skipWaiting();
      })
  );
});

// Fetch event - Network-First strategy
self.addEventListener('fetch', (event) => {
  // Only handle same-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    (async () => {
      try {
        // Try network first
        const networkResponse = await fetch(event.request);

        // Cache successful responses
        if (networkResponse.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, networkResponse.clone());
        }

        return networkResponse;
      } catch (error) {
        // Network failed, try cache
        console.log('[SW] Network failed, serving from cache:', event.request.url);
        const cachedResponse = await caches.match(event.request);

        if (cachedResponse) {
          return cachedResponse;
        }

        // If no cache and it's a navigation request, return cached index.html
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }

        throw error;
      }
    })()
  );
});

// Activate event - clean up old caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Clean old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients immediately
      self.clients.claim().then(() => {
        console.log('[SW] Claimed all clients');
      })
    ])
  );
});
