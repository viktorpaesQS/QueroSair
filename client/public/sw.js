const CACHE_NAME = 'quero-sair-v1';
const urlsToCache = [
  '/',
  '/src/index.css',
  '/src/main.tsx',
  '/src/App.tsx',
  // Add other static assets that should be cached
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  // For API requests, try network first, then cache
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If successful, clone and cache the response
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // If network fails, try to serve from cache
          return caches.match(event.request);
        })
    );
  } else {
    // For static assets, cache first strategy
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          return response || fetch(event.request);
        })
    );
  }
});

// Push notification event
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'Alguém quer sair e precisa que mova o carro!',
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      tag: 'parking-request',
      requireInteraction: true,
      actions: [
        {
          action: 'view',
          title: 'Ver Pedido',
          icon: '/action-view.png'
        },
        {
          action: 'dismiss',
          title: 'Ignorar',
          icon: '/action-dismiss.png'
        }
      ],
      data: {
        url: '/',
        requestId: data.requestId
      }
    };

    event.waitUntil(
      self.registration.showNotification(
        data.title || 'Quero Sair - Pedido de Saída',
        options
      )
    );
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (event.action === 'dismiss') {
    // Just close the notification
    return;
  } else {
    // Default click - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});