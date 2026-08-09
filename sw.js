const CACHE_NAME = 'porkemon-v2.8';
const BASE_URL = "https://raw.githubusercontent.com/8ytxybb7cg-web/Porkemon/main/";

// 核心資源預載清單
const PRECACHE_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    'https://8ytxybb7cg-web.github.io/Porkemon/icons/icon-192.png',
    'https://8ytxybb7cg-web.github.io/Porkemon/icons/icon-512.png',
    BASE_URL + 'packs/pack.png',
    BASE_URL + 'back/back.png'
];

// 1. 安裝階段：將核心資源寫入快取，並強制跳過等待期以利版本更新
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_ASSETS);
        })
    );
});

// 2. 啟用階段：清除不符合當前 CACHE_NAME 的舊快取
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('清除舊版本快取:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// 3. 攔截請求階段：實作動態快取
self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);

    // 針對動態加載的卡片圖片 (以 /cards_ 開頭的資源) 實作 Cache-First 策略
    if (requestUrl.href.includes('/cards_')) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                // 如果快取裡已經有這張卡片，直接秒開
                if (cachedResponse) return cachedResponse;
                
                // 否則向遠端請求，並將結果存入快取中
                return fetch(event.request).then((networkResponse) => {
                    if (!networkResponse || networkResponse.status !== 200) {
                        return networkResponse;
                    }
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                    return networkResponse;
                });
            })
        );
    } else {
        // 其他資源 (如 index.html) 優先走網路以確保抓到最新版本 (Network-First)
        event.respondWith(
            fetch(event.request).catch(() => caches.match(event.request))
        );
    }
});
