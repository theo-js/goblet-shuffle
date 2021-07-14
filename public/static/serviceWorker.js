const BASE = location.protocol + '//' + location.host;
const PREFIX = 'V19';
const CACHED_FILES = [
    `${BASE}/static/css/main.css`,
    `${BASE}/static/css/solo.css`,
    `${BASE}/static/js/app.js`,
    `${BASE}/static/js/solo.js`,
    `${BASE}/static/icons/goblet96.png`,
    `${BASE}/static/audio/success.mp3`,
    `${BASE}/static/audio/victory.mp3`,
    `${BASE}/static/particles.json`,
    'https://cdn.jsdelivr.net/npm/bootstrap@5.0.1/dist/css/bootstrap.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.1.1/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/particles.js@2.0.0/particles.min.js',
    'https://fonts.googleapis.com/css2?family=Parisienne&display=swap',
    'https://fonts.gstatic.com/s/parisienne/v8/E21i_d3kivvAkxhLEVZpQyhwDw.woff2',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.1.1/webfonts/fa-solid-900.woff2',
    'https://cdnjs.cloudflare.com/ajax/libs/axios/0.21.1/axios.min.js'
];

self.addEventListener('install', event => {
    self.skipWaiting();
    // Cache files
    event.waitUntil(
        (async () => {
            const cache = await caches.open(PREFIX);
            cache.addAll([
                ...CACHED_FILES,
                `${BASE}/static/offline.html`
            ]);
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

self.addEventListener('fetch', async fetchEvent => {
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

self.addEventListener('push', pushEvent => {
    var data = pushEvent.data ? pushEvent.data.json() : { data: { type: 'none', timestamp: Date.now() } };

    // Do not show notification if any client is visible
    let isAnyClientVisible;
    pushEvent.waitUntil(
        (async () => {
            const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
            console.log(windowClients)
            isAnyClientVisible = windowClients.some(client => client.visibilityState === 'visible');
        })()
    );
    console.log('isAnyClientVisible: ', isAnyClientVisible)
    if (isAnyClientVisible) {
        return;
    }

    // Set notification actions depending on notification type
    var actions;
    switch (data.data.type) {
        case 'CHAT_MSG' :
            actions = [
                {
                    action: 'CHAT_MSG_REPLY',
                    title: 'Reply'
                }
            ];
            break;
        default:
            actions = []
    }

    // Show notification
    pushEvent.waitUntil(
        self.registration.showNotification(data.title, {
            badge: '/static/icons/goblet96.png',
            body: data.body,
            timestamp: data.timestamp,
            tag: `${data.data.type}_${data.timestamp}`,
            data: data.data
        })
    );
});

self.addEventListener('notificationclick', event => {
    const { notification, action } = event;
    console.log(action)
    console.log(notification)
    notification.close();
    event.waitUntil(
        openUrl(`${BASE}/${notification.data.room || ''}`)
    );
});

async function openUrl (url) {
    const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === url && 'focus' in client) {
            return client.focus();
        }
    }
    if (self.clients.openWindow) {
        return self.clients.openWindow(url);
    }
    return null;
}