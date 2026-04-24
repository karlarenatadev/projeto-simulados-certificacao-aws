const CACHE_NAME = 'aws-sim-cache-v4'; // Subimos a versão do cache!

// Removemos os .json daqui para não ficarem trancados para sempre
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/js/app.js',
  '/js/data.js',
  '/js/quizEngine.js',
  '/js/storageManager.js',
  '/js/chartManager.js',
  '/js/flashcards.js',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Tenta adicionar todos os recursos, mas não falha se algum não existir
        return Promise.allSettled(
          urlsToCache.map(url => 
            cache.add(url).catch(err => {
              console.warn(`Falha ao cachear ${url}:`, err);
              return null;
            })
          )
        );
      })
      .catch(err => {
        console.error('Erro ao criar cache:', err);
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
              // Só faz cache se a resposta for válida
              if (response && response.status === 200) {
                  const responseClone = response.clone();
                  caches.open(CACHE_NAME).then(cache => {
                      cache.put(event.request, responseClone).catch(err => {
                          console.warn('Erro ao cachear JSON:', err);
                      });
                  });
              }
              return response;
          }).catch(err => {
              console.warn('Erro ao buscar JSON, tentando cache:', err);
              // Se estiver offline/sem internet, usa a versão do cache
              return caches.match(event.request).then(cachedResponse => {
                  if (cachedResponse) {
                      return cachedResponse;
                  }
                  // Se não houver cache, retorna erro 404
                  return new Response(JSON.stringify({ error: 'Recurso não disponível' }), {
                      status: 404,
                      statusText: 'Not Found',
                      headers: { 'Content-Type': 'application/json' }
                  });
              });
          })
      );
      return;
  }

  // Para o resto do site (HTML, CSS), continua a usar Cache First para ser ultrarrápido
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) return response;
        return fetch(event.request).catch(err => {
            console.warn('Erro ao buscar recurso:', event.request.url, err);
            // Retorna uma resposta vazia em caso de erro
            return new Response('', { status: 404, statusText: 'Not Found' });
        });
      })
  );
});