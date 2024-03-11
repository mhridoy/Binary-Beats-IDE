self.addEventListener('install', event => {
    event.waitUntil(
        caches.open('v1').then(cache => {
            return cache.addAll([
                '/', // Assuming you have a route in Flask for this path
                '/static/css/style.css',
                '/static/js/script.js',
                '/static/manifest.json',
                '/static/icons/icon-192x192.png',
                // Add all other resources you want to cache
            ]);
        })
    );
});
self.addEventListener('fetch', function(event) {
    // Check if the request is for the index page
    if (event.request.url.endsWith('/index.html')) {
      // Respond with the network request, bypassing the cache
      event.respondWith(fetch(event.request));
      return;
    }
  
    // For other requests, try to respond with the cached version
    // If it's not in the cache, then return the network response
    event.respondWith(
      caches.match(event.request)
        .then(function(response) {
          return response || fetch(event.request);
        })
    );
  });