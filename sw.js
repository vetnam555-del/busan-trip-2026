/* Offline support: the itinerary must open in Busan even with no data. */
const PREFIX = 'busan-trip-';
const CACHE = PREFIX + 'v5';
const ASSETS = [
  './',
  './index.html',
  './icon.svg',
  './manifest.webmanifest',
  './fonts/ibm-plex-mono-400.woff2',
  './fonts/ibm-plex-mono-600.woff2'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Only clear this guide's own old caches: the Tokyo guide in tokyo/ shares
// this origin and keeps its own cache.
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
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // This worker's scope also covers tokyo/, which has its own worker. Leave
  // those requests alone so the Tokyo page never lands in this cache as
  // './index.html'.
  if (url.pathname.startsWith(new URL('./tokyo/', self.registration.scope).pathname)) return;

  // The page itself: always go to the network first, and bypass the HTTP
  // cache while doing it. GitHub Pages serves HTML with max-age=600, so a
  // plain fetch() here can hand back a ten-minute-old page — which then gets
  // written into the offline cache and pinned there. `cache: 'reload'` forces
  // a real revalidation; the cached copy is only ever the offline fallback.
  if (req.mode === 'navigate') {
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

  // Fonts and icons never change: cache first.
  e.respondWith(
    caches.match(req).then((hit) =>
      hit ||
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })
    )
  );
});
