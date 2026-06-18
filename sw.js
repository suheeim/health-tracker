// Service Worker — ネットワーク優先・オフライン時のみキャッシュ
//
// 方針:
//  - 自サイト(同一オリジン)のGETは毎回ネットから最新を取得し、成功時にキャッシュも更新する。
//    ネットが切れている等で取得に失敗したときだけ、キャッシュした内容を返す（オフライン保険）。
//  - 外部オリジン(api.anthropic.com 等)やPOST等は一切インターセプトしない。
//    （過去に fetch を SW で処理した結果 iOS で API リクエストがブロックされた経緯への対応）
//  - CACHE_NAME にバージョンを持たせ、上げると activate で古いキャッシュが自動破棄される。

const CACHE_NAME = 'health-tracker-v1';

// 主要ファイル（health-tracker の公開構成に合わせた相対パス）
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './ja.json',
];

self.addEventListener('install', function(event) {
  // 新しいSWを即時有効化
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(PRECACHE_URLS);
    }).catch(function() {
      // 一部ファイルが取得できなくてもインストール自体は妨げない
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      // CACHE_NAME 以外（＝古いバージョン）のキャッシュを削除
      return Promise.all(keys.map(function(k) {
        if (k !== CACHE_NAME) return caches.delete(k);
      }));
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event) {
  const req = event.request;
  const url = new URL(req.url);

  // 自サイト(同一オリジン)以外は一切インターセプトしない。
  // → api.anthropic.com などの外部API/クロスオリジンはブラウザ既定の動作に委ねる。
  if (url.origin !== self.location.origin) return;

  // GET以外(POST等)もインターセプトしない。
  if (req.method !== 'GET') return;

  // ネットワーク優先: 最新を取得し、成功時にキャッシュを更新。
  // 失敗時(オフライン)のみキャッシュを返す。
  event.respondWith(
    fetch(req, { cache: 'no-store' }).then(function(res) {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(req, copy);
        });
      }
      return res;
    }).catch(function() {
      return caches.match(req).then(function(cached) {
        if (cached) return cached;
        // ナビゲーション要求はオフライン時に index.html で代替
        if (req.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      });
    })
  );
});
