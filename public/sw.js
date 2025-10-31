// public/sw.js - Service Worker para cache inteligente
const CACHE_NAME = 'nexogeo-v1.1.0';
const STATIC_CACHE = 'nexogeo-static-v1.1.0';
const DYNAMIC_CACHE = 'nexogeo-dynamic-v1.1.0';
const API_CACHE = 'nexogeo-api-v1.1.0';

// Recursos estáticos básicos para cache (apenas os que existem sempre)
const STATIC_ASSETS = [
  '/',
  '/manifest.json'
];

// Recursos da API para cache (com TTL)
const API_CACHE_PATTERNS = [
  /^\/api\/promocoes/,
  /^\/api\/dashboard/,
  /^\/api\/participantes/,
  /^\/api\/ganhadores/,
  /^\/api\/auth/
];

// TTL para diferentes tipos de cache (em milissegundos)
const CACHE_TTL = {
  static: 24 * 60 * 60 * 1000, // 24 horas
  dynamic: 4 * 60 * 60 * 1000, // 4 horas
  api: 5 * 60 * 1000 // 5 minutos
};

// Install event - cachear recursos estáticos
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      self.skipWaiting()
    ])
  );
});

// Activate event - limpar caches antigos
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    Promise.all([
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE &&
                cacheName !== DYNAMIC_CACHE &&
                cacheName !== API_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      self.clients.claim()
    ])
  );
});

// Fetch event - estratégias de cache
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requests não-GET
  if (request.method !== 'GET') {
    return;
  }

  // Estratégia para diferentes tipos de recursos
  if (request.url.includes('/api/')) {
    event.respondWith(handleAPIRequest(request));
  } else if (request.url.includes('/static/')) {
    event.respondWith(handleStaticRequest(request));
  } else {
    event.respondWith(handleNavigationRequest(request));
  }
});

// Estratégia para requests de API - Network First com cache fallback
async function handleAPIRequest(request) {
  const url = new URL(request.url);
  const shouldCache = API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname));

  if (!shouldCache) {
    return fetch(request);
  }

  try {
    // Tentar buscar da rede primeiro
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Cachear resposta bem-sucedida
      const cache = await caches.open(API_CACHE);
      const responseClone = networkResponse.clone();

      // Adicionar timestamp para TTL
      const responseWithTimestamp = new Response(responseClone.body, {
        status: responseClone.status,
        statusText: responseClone.statusText,
        headers: {
          ...responseClone.headers,
          'sw-cached-at': Date.now().toString()
        }
      });

      cache.put(request, responseWithTimestamp);
      return networkResponse;
    }

    throw new Error('Network response not ok');
  } catch (error) {
    console.log('[SW] Network failed, trying cache for API request');

    // Buscar do cache se rede falhar
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      const cachedAt = cachedResponse.headers.get('sw-cached-at');
      const age = Date.now() - parseInt(cachedAt || '0');

      if (age < CACHE_TTL.api) {
        console.log('[SW] Serving fresh API cache');
        return cachedResponse;
      } else {
        console.log('[SW] API cache expired, removing');
        const cache = await caches.open(API_CACHE);
        cache.delete(request);
      }
    }

    // Retornar erro se nem rede nem cache funcionarem
    return new Response(
      JSON.stringify({ error: 'Sem conexão e cache expirado' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Estratégia para recursos estáticos - Cache First
async function handleStaticRequest(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    console.log('[SW] Serving from static cache:', request.url);
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('[SW] Failed to fetch static resource:', error);
    return new Response('Recurso não disponível offline', { status: 404 });
  }
}

// Estratégia para navegação - Network First com fallback para dashboard
async function handleNavigationRequest(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Cachear páginas navegadas com sucesso
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed for navigation, trying cache');

    // Tentar cache primeiro
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Fallback para página principal em caso de offline
    const dashboardCache = await caches.match('/dashboard');
    if (dashboardCache) {
      return dashboardCache;
    }

    // Página offline genérica
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>NexoGeo - Offline</title>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 50px;
              background: #f5f5f5;
            }
            .offline-container {
              max-width: 500px;
              margin: 0 auto;
              background: white;
              padding: 2rem;
              border-radius: 12px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
          </style>
        </head>
        <body>
          <div class="offline-container">
            <h1>🔌 Você está offline</h1>
            <p>Não foi possível carregar esta página. Verifique sua conexão com a internet.</p>
            <button onclick="window.location.reload()">Tentar novamente</button>
          </div>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// Background sync para requests falhados
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    console.log('[SW] Background sync triggered');
    event.waitUntil(
      // Aqui você pode implementar lógica para reenviar requests falhados
      Promise.resolve()
    );
  }
});

// Notificações push (para futuro)
self.addEventListener('push', event => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'Nova notificação do NexoGeo',
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    data: data.url || '/',
    actions: [
      {
        action: 'view',
        title: 'Ver detalhes'
      },
      {
        action: 'dismiss',
        title: 'Dispensar'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'NexoGeo', options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'view') {
    const urlToOpen = event.notification.data || '/dashboard';

    event.waitUntil(
      clients.openWindow(urlToOpen)
    );
  }
});