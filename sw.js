// ServiceWorker - キャッシュ・インターセプト無効化版
// iOSでAPIリクエストがブロックされる問題を回避するため、
// fetchイベントは一切処理しない

self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(k) { return caches.delete(k); }));
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// fetchイベントを登録しない = 全リクエストをそのまま通す
