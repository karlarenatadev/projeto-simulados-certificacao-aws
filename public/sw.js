/**
 * Service Worker for the AWS Certification Simulator PWA
 * Strategy:
 * - Network First for JSON data (questions) to ensure users always have the latest dataset.
 * - Cache First for static assets (HTML, CSS, JS) for fast offline load speeds.
 */
const CACHE_NAME = 'aws-sim-cache-v8'; // Change this to invalidate old caches on deploy.

// Removemos os .json daqui para não ficarem trancados para sempre
const urlsToCache = [
  './',
  './index.html',
  './simulados.html',
  './jornada.html',
  './flashcards.html',
  './diagnostico.html',
  './profile.html',
  './settings.html',
  './resources.html',
  './cases.html',
  './case-view.html',
  './404.html',
  './css/style.css',
  './css/cases.css',
  './js/app.js',
  './js/data.js',
  './js/quizEngine.js',
  './js/storageManager.js',
  './js/chartManager.js',
  './js/flashcards.js',
  './js/shell.js',
  './js/pomodoroManager.js',
  './js/sprintData.js',
  './js/userManager.js',
  './services/api.js',
  './manifest.json'
];

const publicJsonPaths = [
  'data/questions/clf-c02.json',
  'data/questions/clf-c02-en.json',
  'data/questions/saa-c03.json',
  'data/questions/saa-c03-en.json',
  'data/questions/aif-c01.json',
  'data/questions/aif-c01-en.json',
  'data/questions/dva-c02.json',
  'data/questions/dva-c02-en.json',
  'data/nivelamento/diagnostic-clf-c02.json',
  'data/nivelamento/diagnostic-clf-c02-en.json',
  'data/nivelamento/diagnostic-saa-c03.json',
  'data/nivelamento/diagnostic-saa-c03-en.json',
  'data/nivelamento/diagnostic-aif-c01.json',
  'data/nivelamento/diagnostic-aif-c01-en.json',
  'data/nivelamento/diagnostic-dva-c02.json',
  'data/nivelamento/diagnostic-dva-c02-en.json',
  'data/gamificacao/interactive-challenges.json'
];

function isPublicJsonRequest(requestUrl) {
  const url = new URL(requestUrl);
  return publicJsonPaths.some(path => url.pathname.endsWith(`/${path}`));
}

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
  // --- Network First Strategy for JSON data ---
  // Ensure that if the dataset updates on the server, the user gets it.
  // If the network fails (offline), it falls back to the cache.
  if (event.request.url.endsWith('.json') && !event.request.url.includes('manifest.json')) {
      if (!isPublicJsonRequest(event.request.url)) {
          event.respondWith(fetch(event.request));
          return;
      }

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

  // --- Stale-While-Revalidate Strategy for Static Assets ---
  // For HTML, CSS, JS, etc., check cache first to load instantly,
  // but always fetch from network in background to update the cache for next time.
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        const fetchPromise = fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone).catch(err => console.warn('Erro ao cachear recurso estático:', err));
            });
          }
          return networkResponse;
        }).catch(err => {
            console.warn('Erro ao buscar recurso no background:', event.request.url, err);
            // Retorna uma resposta vazia em caso de erro se não houver cache
            if (!cachedResponse) {
                return new Response('', { status: 404, statusText: 'Not Found' });
            }
        });

        // Retorna a resposta em cache imediatamente se existir, 
        // caso contrário aguarda o fetch
        return cachedResponse || fetchPromise;
      })
  );
});
