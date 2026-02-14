const CACHE_NAME = 'beatty-v2.0.0';
const urlsToCache = [
  './',
  './index.html',
  './main.js',
  './styles.css',
  './manifest.json',
  // audio
  './audio/AudioEngine.js',
  './audio/AudioAnalyzer.js',
  './audio/AudioScheduler.js',
  './audio/audio-worklet.js',
  // gl
  './gl/SoundRenderer.js',
  './gl/VisualRenderer.js',
  './gl/ShaderCompiler.js',
  './gl/gl-utils.js',
  './gl/shader-templates.js',
  // controllers
  './controllers/PlaybackController.js',
  './controllers/ShaderController.js',
  './controllers/UIController.js',
  // input
  './input/KeyboardController.js',
  './input/MobileController.js',
  './input/ModalController.js',
  // editor
  './editor/Editor.js',
  // state
  './state/EventBus.js',
  './state/PlaybackState.js',
  './state/AudioSettings.js',
  // ui
  './ui/StatusDisplay.js',
  // utils
  './utils/consts.js',
  './utils/errors.js',
  './utils/storage.js',
];

// Install event - cache resources and skip waiting
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching resources');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[SW] Skip waiting');
        return self.skipWaiting();
      }),
  );
});

// Fetch event - Network-First strategy
self.addEventListener('fetch', (event) => {
  // Only handle same-origin GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip Service Worker file itself to prevent loops
  if (event.request.url.includes('sw.js')) {
    return;
  }

  event.respondWith(
    (async () => {
      try {
        const networkResponse = await fetch(event.request);

        if (networkResponse.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, networkResponse.clone());
        }

        return networkResponse;
      } catch (error) {
        console.log('[SW] Network failed, serving from cache:', event.request.url);
        const cachedResponse = await caches.match(event.request);

        if (cachedResponse) {
          return cachedResponse;
        }

        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }

        throw error;
      }
    })(),
  );
});

// Activate event - clean up old caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }),
        );
      }),
      self.clients.claim().then(() => {
        console.log('[SW] Claimed all clients');
      }),
    ]),
  );
});
