/* The Catalogue: service worker.
 *
 * Makes the app open instantly and work with no connection.
 *  - The app files are saved at install time, then served from the saved copy.
 *    Each visit also fetches a fresh copy in the background, so edits you deploy
 *    show up the next time the app opens.
 *  - Google Fonts (Lora, Courier Prime) are saved on first run. If they can't be
 *    fetched, the app falls back to Georgia and Courier New.
 *  - Your books are not handled here. They live in the browser's IndexedDB.
 *
 * Bump VERSION if you change the CORE or EXTRAS lists or this file's logic.
 */
const VERSION = 'v3';
// Cache names keep their original spelling so existing installs clean up their old copies correctly.
const SHELL_CACHE = 'catalog-shell-' + VERSION;
const FONT_CACHE = 'catalog-fonts';

// Without these the app can't run, so the install fails (and is retried) if any is missing.
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest'
];

// Icons are nice to have offline, but one missing file must not stop the app from installing.
const EXTRAS = [
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './icons/favicon.svg'
];

// Must match the stylesheet <link> in index.html exactly.
const FONT_CSS = 'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;1,400&family=Courier+Prime:wght@400;700&display=swap';
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

// 'reload' skips the browser's HTTP cache so a new install never saves stale files
const fresh = (url) => new Request(url, { cache: 'reload' });

// A font server that never answers (blocked or blackholed networks) must not hold anything up.
async function fetchWithTimeout(url, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { mode: 'cors', signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await cache.addAll(CORE.map(fresh));
    await Promise.allSettled(EXTRAS.map((url) => cache.add(fresh(url))));
    // Fonts are cosmetic: give them a few seconds, then finish installing without them (they are saved on first use instead).
    await Promise.race([precacheFonts().catch(() => {}), new Promise((resolve) => setTimeout(resolve, 5000))]);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((name) => name.startsWith('catalog-shell-') && name !== SHELL_CACHE)
        .map((name) => caches.delete(name))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(fontResponse(request));
    return;
  }
  if (url.origin !== self.location.origin) return;   // anything else off-site goes straight to the network

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

async function precacheFonts() {
  const cache = await caches.open(FONT_CACHE);
  const cssResponse = await fetchWithTimeout(FONT_CSS, 8000);
  if (!cssResponse.ok) return;
  const css = await cssResponse.clone().text();
  await cache.put(FONT_CSS, cssResponse);
  const files = [...css.matchAll(/url\((https:[^)]+)\)/g)].map((m) => m[1]);
  await Promise.all(files.map(async (file) => {
    const response = await fetchWithTimeout(file, 8000);
    if (response.ok) await cache.put(file, response);
  }));
}

// Fonts never change at a given URL, so saved copies are served first.
async function fontResponse(request) {
  const cache = await caches.open(FONT_CACHE);
  const saved = await cache.match(request.url, { ignoreVary: true });
  if (saved) return saved;
  try {
    // Google Fonts allows cross-origin reads. Fetching in that mode gives a readable response we can check and keep,
    // rather than an opaque one (which browsers count as ~7 MB of storage each).
    const response = await fetchWithTimeout(request.url, 10000);
    if (response.ok) cache.put(request.url, response.clone());
    return response;
  } catch (err) {
    return new Response('', { status: 504 });   // the page falls back to its system fonts
  }
}
