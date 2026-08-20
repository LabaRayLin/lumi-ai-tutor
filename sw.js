/**
 * Santa AI Tutor - Service Worker (PWA Offline Engine)
 * Fully compatible with Localhost, Custom Domains, and GitHub Pages subpaths.
 */

const CACHE_NAME = 'santa-ai-pwa-v4.0';

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
  console.log('[Santa PWA Service Worker] Installing and caching core shell for scope:', self.registration.scope);
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      const urlsToCache = RELATIVE_ASSETS.map(path => new URL(path, self.registration.scope).toString());
      return cache.addAll(urlsToCache).catch((err) => {
        console.warn('[Santa PWA] Some assets could not be pre-cached immediately:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: Cleanup older caches
self.addEventListener('activate', (event) => {
  console.log('[Santa PWA Service Worker] Activating & cleaning old caches...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Santa PWA] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Cache First for assets, Network First with Fallback
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bypass external API calls (Gemini / Groq / OpenAI / Ollama / GitHub Gist / JSONBin)
  if (url.origin.includes('googleapis.com') ||
      url.origin.includes('groq.com') ||
      url.origin.includes('openai.com') ||
      url.origin.includes('api.github.com') ||
      url.origin.includes('jsonbin.io') ||
      url.port === '11434') {
    return;
  }

  // Cache First for static chunks, images, fonts, styles
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // SPA Fallback for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match(new URL('./index.html', self.registration.scope).toString()) ||
                 caches.match(new URL('./404.html', self.registration.scope).toString());
        }
      });
    })
  );
});
