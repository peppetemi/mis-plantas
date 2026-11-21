// Service worker: network first, cache as a fallback.
// That way updates arrive right away and the app still opens offline
// (logging requires a connection).
const CACHE = 'piante-v3';
const SHELL = [
  './',
  'index.html',
  'css/styles.css',
  'js/app.js',
  'js/stats.js',
  'js/icons.js',
  'js/config.js',
  'js/db-supabase.js',
  'js/db-demo.js',
  'manifest.webmanifest',
  'img/app-icon-192.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const stessoSito = url.origin === self.location.origin;
  const libreria = url.hostname === 'cdn.jsdelivr.net';
  if (!stessoSito && !libreria) return; // Supabase API: never from the cache

  // 'no-cache' = always revalidate with the server (a 304 is cheap): no stale files
  e.respondWith(
    fetch(req, stessoSito ? { cache: 'no-cache' } : undefined)
      .then((res) => {
        if (res.ok) {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copia));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }))
  );
});
