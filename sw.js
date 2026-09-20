/* The Catalog: service worker.
 *
 * Makes the app open instantly and work with no connection.
 *  - The app files are saved at install time, then served from the saved copy.
 *    Each visit also fetches a fresh copy in the background, so edits you deploy
 *    show up the next time the app opens.
 *  - Google Fonts (Lora, Courier Prime) are saved on first run. If they can't be
 *    fetched, the app falls back to Georgia and Courier New.
 *  - Your books are not handled here. They live in the browser's IndexedDB.
 *
 * Bump VERSION if you change the SHELL list or this file's logic.
 */
const VERSION = 'v1';
const SHELL_CACHE = 'catalog-shell-' + VERSION;
const FONT_CACHE = 'catalog-fonts';

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
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

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    // 'reload' skips the browser's HTTP cache so a new install never saves stale files
    await cache.addAll(SHELL.map((url) => new Request(url, { cache: 'reload' })));
    await precacheFonts().catch(() => {});   // best effort: fonts are cosmetic
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
  return response || new Response('The Catalog is offline and this file was never saved.', {
    status: 503,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}

async function precacheFonts() {
  const cache = await caches.open(FONT_CACHE);
  const cssResponse = await fetch(FONT_CSS, { mode: 'cors' });
  if (!cssResponse.ok) return;
  const css = await cssResponse.clone().text();
  await cache.put(FONT_CSS, cssResponse);
  const files = [...css.matchAll(/url\((https:[^)]+)\)/g)].map((m) => m[1]);
  await Promise.all(files.map(async (file) => {
    const response = await fetch(file, { mode: 'cors' });
    if (response.ok) await cache.put(file, response);
  }));
}

// Fonts never change at a given URL, so saved copies are served first.
async function fontResponse(request) {
  const cache = await caches.open(FONT_CACHE);
  const saved = await cache.match(request, { ignoreVary: true });
  if (saved) return saved;
  try {
    const response = await fetch(request);
    if (response.ok || response.type === 'opaque') cache.put(request, response.clone());
    return response;
  } catch (err) {
    return new Response('', { status: 504 });   // the page falls back to its system fonts
  }
}
