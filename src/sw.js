const CACHE_NAME = 'beatty-v1.0.5';
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

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache when offline
async function cleanRedirect(response) {
  const cached = response.clone();
  const blob = await cached.blob();
  return new Response(blob, {
    headers: cached.headers,
    status: cached.status,
    statusText: cached.statusText
  });
}

self.addEventListener('fetch', event => {
  event.respondWith((async () => {
    const resp = await caches.match(event.request);
    if (resp) {
      if (event.request.mode === 'navigate' && resp.redirected) {
        return cleanRedirect(resp);
      }
      return resp;
    }
    return fetch(event.request, { redirect: 'follow', mode: 'cors', credentials: 'same-origin' });
  })());
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
