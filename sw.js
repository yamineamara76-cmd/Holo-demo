/* HOLO — service worker : app installable + ouverture hors connexion.
   Réseau d'abord (toujours la dernière version), copie locale en secours. Les données (/api) ne passent jamais par ici. */
const CACHE = 'holo-shell-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api')) return;
  e.respondWith(
    fetch(e.request).then(r => {
      if (r.ok) { const c = r.clone(); caches.open(CACHE).then(k => k.put(e.request, c)); }
      return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: u.pathname === '/' || u.pathname.endsWith('.html') }))
  );
});
