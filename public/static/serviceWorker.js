self.addEventListener('fetch', fetchEvent => {
    if (fetchEvent.request.mode === 'navigate') {
        console.log('NAVIGATE MODE => event.respondWith')
        /*fetchEvent.respondWith((async () => {
                return new Response('Hello world');
        })());
    }*/
});

self.addEventListener('install', function (event) {
    console.log('Service worker: Installing ...');
    console.log(event)
});