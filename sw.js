const CACHE = 'bonos-agave-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css',
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/fonts/tabler-icons.woff2'
];

// Instalar y cachear recursos
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      return Promise.allSettled(
        ASSETS.map(url => cache.add(url).catch(() => null))
      );
    })
  );
  self.skipWaiting();
});

// Activar y limpiar caches viejos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Interceptar peticiones — cache first para assets, network first para API
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Google Apps Script (API) — siempre red
  if (url.hostname.includes('script.google.com')) {
    e.respondWith(fetch(e.request).catch(() => new Response(JSON.stringify({ok:false,msg:'offline'}), {headers:{'Content-Type':'application/json'}})));
    return;
  }

  // Assets locales y CDN — cache first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
