var CACHE_NAME = 'taiso-v1';
var urlsToCache = [
  './',
  './index.html'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(names.filter(function(n) { return n !== CACHE_NAME; }).map(function(n) { return caches.delete(n); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event) {
  // Anthropic APIへのリクエストはキャッシュせずそのまま通す
  if (event.request.url.indexOf('api.anthropic.com') !== -1) {
    return;
  }
  // fonts.googleapis.com などの外部リソースもそのまま通す
  if (event.request.url.indexOf('fonts.googleapis.com') !== -1 ||
      event.request.url.indexOf('fonts.gstatic.com') !== -1 ||
      event.request.url.indexOf('cdnjs.cloudflare.com') !== -1) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function(response) {
      if (response) return response;
      return fetch(event.request).catch(function() {
        return caches.match('./index.html');
      });
    })
  );
});
