// Tvacha Clinic service worker
// App shell + static asset caching only.
// NEVER cache Supabase API, auth, storage, or realtime traffic — doing so
// would leak data across doctors and break RLS.

const VERSION = 'tvacha-sw-v1';
const SHELL_CACHE = `${VERSION}-shell`;
const STATIC_CACHE = `${VERSION}-static`;

const SHELL_URLS = [
  '/',
  '/manifest.json',
  '/logo.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Request URLs that must always go to the network and must never enter cache.
const NEVER_CACHE_PATTERNS = [
  /\/rest\/v1\//,
  /\/auth\/v1\//,
  /\/storage\/v1\//,
  /\/realtime\/v1\//,
  /\/functions\/v1\//,
  /\/api\//,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS)).catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith(VERSION))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

function shouldBypass(url) {
  if (NEVER_CACHE_PATTERNS.some((re) => re.test(url.pathname))) return true;
  // Supabase project URLs live on a different origin — bypass all cross-origin
  // except our own static assets CDN (Next's /_next/static).
  return false;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;

  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  if (shouldBypass(url)) return;

  // Never touch Supabase or other 3rd-party origins.
  if (url.origin !== self.location.origin) return;

  // Static assets: cache-first.
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/logo.svg' ||
    url.pathname === '/manifest.json' ||
    /\.(?:css|js|woff2?|ttf|eot|png|jpg|jpeg|svg|webp|ico)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        try {
          const res = await fetch(req);
          if (res && res.status === 200 && res.type === 'basic') cache.put(req, res.clone());
          return res;
        } catch {
          return hit || Response.error();
        }
      })
    );
    return;
  }

  // HTML navigations: network-first with shell fallback.
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(
      fetch(req)
        .then((res) => res)
        .catch(async () => {
          const shell = await caches.match('/');
          return shell || Response.error();
        })
    );
    return;
  }
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
