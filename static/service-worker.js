// ChordLens Service Worker
// SF2ファイルをキャッシュして高速化

const CACHE_NAME = 'chord-lens-v1';
const SF2_URL = 'https://pub-50ca9c7c99bd45e3a932d181bfe5c961.r2.dev/SalamanderGrandPiano-V3+20200602.sf2';

// インストール時
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  // 新しいService Workerをすぐにアクティブ化
  self.skipWaiting();
});

// アクティベート時
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  // 古いキャッシュを削除
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // すぐに制御を開始
  return self.clients.claim();
});

// フェッチ時
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // SF2ファイルのリクエストをキャッシュ
  if (url === SF2_URL) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            console.log('[Service Worker] SF2 found in cache');
            return cachedResponse;
          }

          console.log('[Service Worker] Downloading SF2...');
          return fetch(event.request).then((response) => {
            // レスポンスをクローンしてキャッシュに保存
            if (response.ok) {
              cache.put(event.request, response.clone());
              console.log('[Service Worker] SF2 cached');
            }
            return response;
          });
        });
      })
    );
  } else {
    // 他のリクエストはそのまま通す
    event.respondWith(fetch(event.request));
  }
});
