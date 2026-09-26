/* Offline support: the guide has to open in a Tokyo subway car with no signal. */
const PREFIX = 'tokyo-trip-';
const CACHE = PREFIX + 'v3';
const ASSETS = [
  './',
  './index.html',
  './icon.svg',
  './manifest.webmanifest',
  './fonts/barlow-sc-500.woff2',
  './fonts/barlow-sc-600.woff2',
  './fonts/shippori-mincho-800-v2.woff2'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Only clear this guide's own old caches. The Busan guide lives on the same
// origin and keeps its own cache; deleting every other key would wipe it.
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  // The page: network first with a real revalidation (GitHub Pages sends
  // max-age=600, so a plain fetch could hand back and pin a stale copy).
  // The cached copy is only the offline fallback.
  if (req.mode === 'navigate') {
    // Only the guide itself is stored as the offline page. Other files opened
    // from it (the .ics calendar) must not overwrite that copy.
    const path = new URL(req.url).pathname;
    if (!path.endsWith('/') && !path.endsWith('/index.html')) return;
    e.respondWith(
      fetch(req.url, { cache: 'reload', credentials: 'same-origin' })
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put('./index.html', copy));
          }
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Fonts and icon never change: cache first.
  e.respondWith(
    caches.match(req).then((hit) =>
      hit ||
      fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
    )
  );
});
