const BASE = location.protocol + '//' + location.host;
const PREFIX = 'V1';
const CACHED_FILES = [
    `${BASE}/static/css/main.css`,
    `${BASE}/static/css/solo.css`,
    `${BASE}/static/js/app.js`,
    `${BASE}/static/js/solo.js`,
    `${BASE}/static/icons/goblet96.PNG`,
    `${BASE}/static/audio/success.mp3`,
    `${BASE}/static/audio/victory.mp3`,
    `${BASE}/static/particles.json`,
    'https://cdn.jsdelivr.net/npm/bootstrap@5.0.1/dist/css/bootstrap.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.1.1/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/particles.js@2.0.0/particles.min.js',
    'https://fonts.googleapis.com/css2?family=Parisienne&display=swap',
    'https://fonts.gstatic.com/s/parisienne/v8/E21i_d3kivvAkxhLEVZpQyhwDw.woff2',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.1.1/webfonts/fa-solid-900.woff2'
];

self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        (async () => {
            const cache = await caches.open(PREFIX);
            cache.addAll([
                ...CACHED_FILES,
                `${BASE}/static/offline.html`
            ]);
            console.log(cache)
        })()
    )
});

self.addEventListener('activate', event => {
    clients.claim();
    // Clean caches of other versions
    event.waitUntil(
        (async () => {
            const keys = await caches.keys();
            // Wait until all keys have been cleared
            await Promise.all(
                keys.map(key => {
                    if (!key.includes(PREFIX)) {
                        return caches.delete(key);
                    }
               })
            );
        })()
    );
});

self.addEventListener('fetch', fetchEvent => {
    if (fetchEvent.request.mode === 'navigate') {
        fetchEvent.respondWith((async () => {
            try  {
                const preloadResponse = await fetchEvent.preloadResponse;
                if (preloadResponse) {
                    return preloadResponse;
                }

                return await fetch(fetchEvent.request);
            } catch (e) {
                const cache = await caches.open(PREFIX);
                return await cache.match('/static/offline.html');
            }
        })());
    } else if (CACHED_FILES.includes(fetchEvent.request.url)) {
        // Send cached version of the file
        fetchEvent.respondWith(caches.match(fetchEvent.request.url));
    }
});