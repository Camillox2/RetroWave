const CACHE_NAME = 'retrowave-v4';
const PRECACHE_URLS = [
  '/',
  '/favicon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Não interceptar requests que não sejam GET (POST, PUT, DELETE etc.)
  if (request.method !== 'GET') return;

  const url = request.url;

  // L-1: Nunca cachear respostas JSON da API (dados podem mudar a qualquer momento)
  // Permitir apenas imagens binárias da API
  if (url.includes('/api/')) {
    if (url.includes('/thumb') || url.includes('/bin') || url.includes('/banner-image')) {
      // Cache imagens da API — essas mudam raramente
      event.respondWith(
        fetch(request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(() => caches.match(request))
      );
    }
    // Todos os outros endpoints /api/ passam direto sem cache
    return;
  }

  // Assets estáticos — network first, fallback cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
