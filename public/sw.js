const CACHE_NAME = 'biyunote-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/assets/App-CEi_s2iG.css',
  '/assets/index-CMsVaf-q.css',
  '/assets/App-B2dwWptY.js',
  '/assets/vendor-react-1wgkHQEd.js',
  '/assets/vendor-firebase-DKyaueGe.js',
  '/assets/vendor-capacitor-Bm7NWSxP.js',
  '/assets/name-plate-frame.webp',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(ASSETS);
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 캐시에 요청된 자산이 있으면 캐시된 응답을 반환
        if (response) {
          return response;
        }
        // 캐시에 없으면 네트워크로 요청
        return fetch(event.request).then(
          (response) => {
            // 응답이 유효한지 확인
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // 응답을 캐시에 저장
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // 오래된 캐시 삭제
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

