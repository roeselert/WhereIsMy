const CACHE_NAME = 'whereismy-v1';
const CACHE_DURATION = 60 * 1000; // 1 minute in milliseconds
const urlsToCache = [
    '/',
    '/index.html',
    '/app.js',
    '/styles.css',
    '/manifest.json'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    const cachedTime = response.headers.get('sw-cache-time');
                    if (cachedTime && Date.now() - parseInt(cachedTime) < CACHE_DURATION) {
                        return response;
                    }
                }
                
                return fetch(event.request)
                    .then(fetchResponse => {
                        if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
                            return fetchResponse;
                        }

                        const responseToCache = fetchResponse.clone();
                        const headers = new Headers(responseToCache.headers);
                        headers.set('sw-cache-time', Date.now().toString());

                        const modifiedResponse = new Response(responseToCache.body, {
                            status: responseToCache.status,
                            statusText: responseToCache.statusText,
                            headers: headers
                        });

                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, modifiedResponse.clone());
                            });

                        return modifiedResponse;
                    });
            })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});