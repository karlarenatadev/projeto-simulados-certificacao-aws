const CACHE_NAME = 'aws-sim-cache-v2'; // Subimos a versão do cache!

// Removemos os .json daqui para não ficarem trancados para sempre
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/data.js',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  // Limpa caches antigos
  const cacheAllowlist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheAllowlist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // LÓGICA MÁGICA: Se for um arquivo JSON de questões, tenta sempre a Rede Primeiro!
  if (event.request.url.endsWith('.json') && !event.request.url.includes('manifest.json')) {
      event.respondWith(
          fetch(event.request).then(response => {
              // Guarda a versão gerada pela IA no cache
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
              return response;
          }).catch(() => {
              // Se estiver offline/sem internet, usa a versão do cache
              return caches.match(event.request);
          })
      );
      return;
  }

  // Para o resto do site (HTML, CSS), continua a usar Cache First para ser ultrarrápido
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) return response;
        return fetch(event.request);
      })
  );
});