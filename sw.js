/**
 * Lumi AI Tutor - Service Worker (PWA Resilient Offline Engine v6.1)
 * Fully compatible with Localhost, Custom Domains, and GitHub Pages subpaths.
 * Features:
 * 1. Dual-Tier Cache Partitioning (Core App Shell vs. Dynamic Runtime Chunks).
 * 2. Automated LRU / Max-Entries Trimming to prevent cache storage bloat.
 * 3. In-depth Stale Asset Pruning during Activate phase.
 * 4. Resilient Promise.allSettled pre-caching.
 */

const CACHE_PREFIX = 'lumi-ai-pwa';
const CORE_CACHE_NAME = `${CACHE_PREFIX}-core-v6.1`;
const RUNTIME_CACHE_NAME = `${CACHE_PREFIX}-runtime-v6.1`;
const CURRENT_CACHES = [CORE_CACHE_NAME, RUNTIME_CACHE_NAME];

const MAX_RUNTIME_ENTRIES = 50; // Keep at most 50 dynamic chunks/assets to prevent storage bloat

// Guaranteed Core Application Shell (Essential for offline operation)
const CORE_CRITICAL_ASSETS = [
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
  './assets/img_onboarding_kv.bb65f35e.webp'
];

// Helper: Trim cache to maximum allowed entries (FIFO/LRU eviction)
async function trimCache(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
      const itemsToDelete = keys.slice(0, keys.length - maxItems);
      await Promise.all(itemsToDelete.map(key => cache.delete(key)));
      console.log(`[Lumi PWA Cache Manager] Evicted ${itemsToDelete.length} stale items from ${cacheName}`);
    }
  } catch (err) {
    console.warn('[Lumi PWA Cache Manager] Error trimming cache:', err);
  }
}

// Helper: Determine if a request URL belongs to the core static shell
function isCoreAsset(requestUrl) {
  try {
    const url = new URL(requestUrl);
    return CORE_CRITICAL_ASSETS.some(p => {
      const full = new URL(p, self.registration.scope).toString();
      return full === url.href;
    });
  } catch (e) {
    return false;
  }
}

// Install Event: Resilient Pre-caching of Core Shell (Wait for user confirmation before activating)
self.addEventListener('install', (event) => {
  console.log('[Lumi PWA Service Worker] Installing v6.2 with Dual-Tier Resilient Cache...');
  // Note: Unconditional skipWaiting() removed to prevent crashing in-flight SPA user sessions.

  event.waitUntil(
    caches.open(CORE_CACHE_NAME).then(async (cache) => {
      const urls = CORE_CRITICAL_ASSETS.map(path => new URL(path, self.registration.scope).toString());

      const results = await Promise.allSettled(
        urls.map(async (url) => {
          try {
            const response = await fetch(url, { cache: 'no-cache' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            await cache.put(url, response);
            return url;
          } catch (err) {
            console.warn(`[Lumi PWA] Pre-cache skipped core asset (${err.message}): ${url}`);
            throw err;
          }
        })
      );

      const cachedCount = results.filter(r => r.status === 'fulfilled').length;
      console.log(`[Lumi PWA Service Worker] Core App Shell pre-cache complete: ${cachedCount} assets.`);
    })
  );
});

// Message Event: Listen for SKIP_WAITING from UI when user confirms update
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[Lumi PWA Service Worker] User approved update via UI. Calling skipWaiting()...');
    self.skipWaiting();
  }
});

// Activate Event: Comprehensive Cache Cleaning & In-Cache Stale Asset Pruning
self.addEventListener('activate', (event) => {
  console.log('[Lumi PWA Service Worker] Activating v6.1 & performing deep cache cleanup...');
  event.waitUntil(
    (async () => {
      // 1. Delete outdated cache namespaces
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(async (cache) => {
          if (!CURRENT_CACHES.includes(cache)) {
            console.log('[Lumi PWA] Purged legacy cache storage:', cache);
            return caches.delete(cache);
          }
        })
      );

      // 2. Deep Clean Core Cache: remove any orphaned entries not in CORE_CRITICAL_ASSETS
      try {
        const coreCache = await caches.open(CORE_CACHE_NAME);
        const coreKeys = await coreCache.keys();
        const validCoreUrls = new Set(CORE_CRITICAL_ASSETS.map(p => new URL(p, self.registration.scope).toString()));

        await Promise.all(
          coreKeys.map(async (request) => {
            if (!validCoreUrls.has(request.url)) {
              console.log('[Lumi PWA] Pruning orphaned entry from Core Cache:', request.url);
              await coreCache.delete(request);
            }
          })
        );
      } catch (e) {
        console.warn('[Lumi PWA] Core cache deep clean notice:', e);
      }

      // 3. Ensure Runtime Cache stays within quota
      await trimCache(RUNTIME_CACHE_NAME, MAX_RUNTIME_ENTRIES);

      // 4. Immediately take control of all open client tabs
      await self.clients.claim();
      console.log('[Lumi PWA Service Worker] v6.1 active and all clients claimed.');
    })()
  );
});

// Fetch Event: Network-First for Documents, Stale-While-Revalidate + LRU Limiter for Assets
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

  // 1. Navigation / HTML Document requests: ALWAYS Network-First with Offline Fallback
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CORE_CACHE_NAME).then((cache) => cache.put(event.request, copy));
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

  // 2. Static Assets (JS, CSS, Images, Next.js dynamic chunks): Stale-While-Revalidate + LRU Limiter
  event.respondWith(
    (async () => {
      // Check in Core Cache first, then Runtime Cache
      const cachedResponse = await caches.match(event.request);

      const fetchPromise = fetch(event.request).then(async (networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const copy = networkResponse.clone();
          const targetCache = isCoreAsset(event.request.url) ? CORE_CACHE_NAME : RUNTIME_CACHE_NAME;
          const cache = await caches.open(targetCache);
          await cache.put(event.request, copy);

          // If dynamically caching to runtime, enforce max entries limit
          if (targetCache === RUNTIME_CACHE_NAME) {
            trimCache(RUNTIME_CACHE_NAME, MAX_RUNTIME_ENTRIES);
          }
        }
        return networkResponse;
      }).catch(() => null);

      return cachedResponse || fetchPromise;
    })()
  );
});
