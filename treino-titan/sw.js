// Service worker do Treino Titan.
// - App (mesma origem): rede primeiro (3 s); se a rede falhar/demorar, usa o cache. Online sempre pega a versão nova.
// - Fotos dos exercícios e SDK do Firebase: cache primeiro (ficam disponíveis offline depois da 1ª vez).
// - Firestore/Auth (googleapis): nunca passam pelo cache.
const VERSION = 'titan-v1';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'js/app.js', 'js/store.js', 'js/images.js', 'js/firebase.js', 'js/progress.js', 'js/pwa.js',
  'js/firebase-config.js', 'js/data/exercises.js', 'js/data/plan.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];
const EXTERNAL_OK = ['raw.githubusercontent.com', 'www.gstatic.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => null)))) // arquivo ausente não derruba a instalação
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function networkFirst(req, timeoutMs = 3000) {
  return new Promise((resolve) => {
    let settled = false;
    const fallback = () => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('index.html'));
    const timer = setTimeout(() => {
      if (settled) return;
      fallback().then((hit) => { if (hit && !settled) { settled = true; resolve(hit); } });
    }, timeoutMs);
    fetch(req).then((res) => {
      clearTimeout(timer);
      if (res && res.ok) caches.open(VERSION).then((c) => c.put(req, res.clone()));
      if (!settled) { settled = true; resolve(res); }
    }).catch(() => {
      clearTimeout(timer);
      if (settled) return;
      fallback().then((hit) => { settled = true; resolve(hit || Response.error()); });
    });
  });
}

function cacheFirst(req) {
  return caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res && (res.ok || res.type === 'opaque')) caches.open(VERSION).then((c) => c.put(req, res.clone()));
    return res;
  }));
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    e.respondWith(networkFirst(req));
  } else if (EXTERNAL_OK.includes(url.hostname)) {
    e.respondWith(cacheFirst(req).catch(() => Response.error()));
  }
});
