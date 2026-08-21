/**
 * Lumi AI Tutor - Service Worker (PWA High-Reliability Offline Engine)
 * Fully compatible with Localhost, Custom Domains, and GitHub Pages subpaths.
 */

const CACHE_NAME = 'lumi-ai-pwa-v5.1';

// Relative assets to cache based on registration base path
const RELATIVE_ASSETS = [
  './',
  './index.html',
  './404.html',
  './manifest.json',
  './mock-api.js',
  './ai-service.js',
  './e2ee-sync.js',
  './vocabulary-data.js',
  './questions-data.js',
  './speaking-data.js',
  './settings-modal.js',
  './assets/favicon.webp',
  './assets/img_onboarding_kv.bb65f35e.webp',
  './_next/static/css/92dd231bb3a5bc1c.css',
  './_next/static/css/1ba5ded7943c543d.css',
  './_next/static/css/1bff5a024019dd7b.css',
  './_next/static/chunks/polyfills-42372ed130431b0a.js',
  './_next/static/chunks/webpack-50c5564d99b24dc1.js',
  './_next/static/chunks/framework-dc0c8ce2bb6ada39.js',
  './_next/static/chunks/main-93efd2d72a01a9d0.js',
  './_next/static/chunks/pages/_app-17f5f6443af84651.js'
];

// Install Event: Pre-cache core shell assets
self.addEventListener('install', (event) => {
  console.log('[Lumi PWA Service Worker] Installing and caching core shell for scope:', self.registration.scope);
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      const urlsToCache = RELATIVE_ASSETS.map(path => new URL(path, self.registration.scope).toString());
      return cache.addAll(urlsToCache).catch((err) => {
        console.warn('[Lumi PWA] Some assets could not be pre-cached immediately:', err);
      });
    })
  );
});

// Activate Event: Immediately delete all older caches and claim clients
self.addEventListener('activate', (event) => {
  console.log('[Lumi PWA Service Worker] Activating & cleaning older caches...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Lumi PWA] Purging outdated cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Network-First for HTML/Navigations, Stale-While-Revalidate for Assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bypass external API calls (Gemini / Groq / OpenAI / Ollama / GitHub Gist / JSONBin / TTS)
  if (url.origin.includes('googleapis.com') ||
      url.origin.includes('groq.com') ||
      url.origin.includes('openai.com') ||
      url.origin.includes('api.github.com') ||
      url.origin.includes('youdao.com') ||
      url.origin.includes('baidu.com') ||
      url.origin.includes('jsonbin.io') ||
      url.port === '11434') {
    return;
  }

  // 1. Navigation / HTML Document requests: ALWAYS Network-First so users get latest fixes immediately
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request) ||
                 caches.match(new URL('./index.html', self.registration.scope).toString()) ||
                 caches.match(new URL('./404.html', self.registration.scope).toString());
        })
    );
    return;
  }

  // 2. Static Assets (JS, CSS, Images): Cache First with Background Update
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return networkResponse;
      }).catch(() => null);

      return cachedResponse || fetchPromise;
    })
  );
});
