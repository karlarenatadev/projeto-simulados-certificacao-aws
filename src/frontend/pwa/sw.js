/* CloudAcademy A3 Service Worker. The build replaces __CACHE_VERSION__. */
const CACHE_PREFIX = "cloudacademy-a3-";
const CACHE_NAME = `${CACHE_PREFIX}__CACHE_VERSION__`;

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./simulados.html",
  "./diagnostico.html",
  "./flashcards.html",
  "./dicas-prova.html",
  "./cases.html",
  "./laboratorios.html",
  "./resources.html",
  "./jornada.html",
  "./study-sprint.html",
  "./404.html",
  "./css/style.css",
  "./css/cases.css",
  "./js/app.js",
  "./js/shell.js",
  "./js/flashcards.js",
  "./js/examTipsPage.js",
  "./js/recommendations/examTips.js",
  "./data/exam-tips.json",
  "./data/taxonomy/certification-manifest.json",
  "./manifest.json",
];

const LAZY_PUBLIC_JSON = new Set([
  "data/exam-tips.json",
  "data/taxonomy/certification-manifest.json",
  "data/questions/clf-c02.json",
  "data/questions/clf-c02-en.json",
  "data/questions/saa-c03.json",
  "data/questions/saa-c03-en.json",
  "data/questions/aif-c01.json",
  "data/questions/aif-c01-en.json",
  "data/questions/dva-c02.json",
  "data/questions/dva-c02-en.json",
  "data/nivelamento/diagnostic-clf-c02.json",
  "data/nivelamento/diagnostic-clf-c02-en.json",
  "data/nivelamento/diagnostic-saa-c03.json",
  "data/nivelamento/diagnostic-saa-c03-en.json",
  "data/nivelamento/diagnostic-aif-c01.json",
  "data/nivelamento/diagnostic-aif-c01-en.json",
  "data/nivelamento/diagnostic-dva-c02.json",
  "data/nivelamento/diagnostic-dva-c02-en.json",
  "data/gamificacao/interactive-challenges.json",
]);

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isApiRequest(url) {
  return url.pathname.includes("/api/");
}

function isLazyPublicJson(url) {
  const scopePath = new URL(self.registration.scope).pathname;
  const relativePath = url.pathname.replace(scopePath, "");
  return LAZY_PUBLIC_JSON.has(relativePath.replace(/^\/+/, ""));
}

async function cacheNetworkResponse(request) {
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter(
              (cacheName) =>
                cacheName.startsWith(CACHE_PREFIX) && cacheName !== CACHE_NAME,
            )
            .map((cacheName) => caches.delete(cacheName)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);
  if (!isSameOrigin(requestUrl) || isApiRequest(requestUrl)) return;

  if (event.request.method !== "GET") return;

  if (requestUrl.pathname.endsWith(".json") && !isLazyPublicJson(requestUrl)) {
    return;
  }

  if (requestUrl.pathname.endsWith(".json")) {
    event.respondWith(
      cacheNetworkResponse(event.request).catch(() =>
        caches.match(event.request).then(
          (cachedResponse) =>
            cachedResponse ||
            new Response(JSON.stringify({ error: "Offline" }), {
              status: 503,
              headers: { "Content-Type": "application/json" },
            }),
        ),
      ),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const update = cacheNetworkResponse(event.request).catch(() => null);
      if (cachedResponse) return cachedResponse;
      return update.then(
        (networkResponse) =>
          networkResponse ||
          (event.request.mode === "navigate"
            ? caches.match(new URL("./index.html", self.registration.scope))
            : new Response("Offline", { status: 503 })),
      );
    }),
  );
});
