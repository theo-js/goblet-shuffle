self.addEventListener('fetch', fetchEvent => {
    if (fetchEvent.request.mode === 'navigate') {
        /*fetchEvent.respondWith((async () => {
            try  {
                const preloadResponse = await fetchEvent.preloadResponse;
                if (preloadResponse) {
                    return preloadResponse;
                }

                return await fetch(event.request);
            } catch (e) {
                return new Response('Hello world');
            }
        })());*/
    }
});

self.addEventListener('install', function (event) {
    console.log('Service worker: Installing ...');
    console.log(event)
});