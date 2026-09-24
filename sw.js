/* The Catalogue: service worker.
 *
 * Makes the app open instantly and work with no connection.
 *  - The app files are saved at install time, then served from the saved copy.
 *    Each visit also fetches a fresh copy in the background, so edits you deploy
 *    show up the next time the app opens.
 *  - Every font the app uses (Lora, Liberation Mono) is bundled in fonts/ and saved
 *    alongside the app. Nothing is fetched from any other server, ever.
 *  - Your books are not handled here. They live in the browser's IndexedDB.
 *
 * Bump VERSION if you change the CORE or EXTRAS lists or this file's logic.
 */
const VERSION = 'v5';
// Cache names keep their original spelling so existing installs clean up their old copies correctly.
const SHELL_CACHE = 'catalog-shell-' + VERSION;

// Without these the app can't run, so the install fails (and is retried) if any is missing.
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest'
];

// Icons and fonts are nice to have offline, but one missing file must not stop the app from installing.
const EXTRAS = [
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './icons/favicon.svg',
  './fonts/lora-400.woff2',
  './fonts/lora-500.woff2',
  './fonts/lora-600.woff2',
  './fonts/lora-italic-400.woff2',
  './fonts/liberation-mono-400.woff2',
  './fonts/liberation-mono-700.woff2'
];

// 'reload' skips the browser's HTTP cache so a new install never saves stale files
const fresh = (url) => new Request(url, { cache: 'reload' });

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await cache.addAll(CORE.map(fresh));
    await Promise.allSettled(EXTRAS.map((url) => cache.add(fresh(url))));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names
        // 'catalog-fonts' was used by earlier versions to save fonts fetched from Google; nothing
        // fetches from anywhere but this app any more, so a copy left over from before is deleted.
        .filter((name) => (name.startsWith('catalog-shell-') && name !== SHELL_CACHE) || name === 'catalog-fonts')
        .map((name) => caches.delete(name))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;   // everything this app needs is same-origin; anything else goes straight to the network

  // Every page load gets the saved app; the query string (e.g. ?add=1) is ignored.
  const target = request.mode === 'navigate' ? './index.html' : request;
  event.respondWith(savedThenRefresh(event, target));
});

// Serve the saved copy immediately; fetch a fresh one in the background for next time.
async function savedThenRefresh(event, target) {
  const cache = await caches.open(SHELL_CACHE);
  const saved = await cache.match(target);
  const refresh = fetch(target, { cache: 'no-cache' })   // no-cache = revalidate, cheap when unchanged
    .then((response) => {
      if (response && response.ok) cache.put(target, response.clone());
      return response;
    })
    .catch(() => null);

  if (saved) {
    event.waitUntil(refresh);
    return saved;
  }
  const response = await refresh;
  return response || new Response('The Catalogue is offline and this file was never saved.', {
    status: 503,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}
