/*
 * Service worker du Hub familial — coquille hors ligne.
 * =====================================================
 * L'app reste « connectée par nature » (les données viennent des API Google au
 * moment de la requête) : ce worker ne rend PAS les données disponibles hors ligne,
 * mais il permet à l'app de S'OUVRIR sans réseau et d'afficher les dernières pages
 * consultées, sinon une page « hors ligne » soignée au lieu de l'erreur du navigateur.
 *
 * Stratégies :
 *   · écritures (POST/…) et /api/*         → réseau direct, jamais de cache ;
 *   · fichiers statiques (hashés)          → cache d'abord (sûr, noms versionnés) ;
 *   · navigations (pages)                  → réseau d'abord, repli sur la copie en
 *                                            cache, sinon la page /hors-ligne.
 */
const CACHE = 'hub-familial-v1';
const PRECACHE = ['/hors-ligne', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return; // écritures : jamais interceptées
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // ressources tierces : réseau direct
  if (url.pathname.startsWith('/api/')) return; // données dynamiques / auth : réseau direct

  // Navigations (pages) : réseau d'abord ; on garde une copie pour le hors-ligne.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((rep) => {
          const copie = rep.clone();
          caches.open(CACHE).then((c) => c.put(req, copie));
          return rep;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('/hors-ligne'))),
    );
    return;
  }

  // Fichiers statiques (JS/CSS/polices/images) : cache d'abord, sinon réseau + mise en cache.
  if (
    url.pathname.startsWith('/_next/static/') ||
    /\.(?:js|css|woff2?|png|jpe?g|svg|ico|webmanifest)$/.test(url.pathname)
  ) {
    e.respondWith(
      caches.match(req).then(
        (c) =>
          c ||
          fetch(req).then((rep) => {
            const copie = rep.clone();
            caches.open(CACHE).then((cc) => cc.put(req, copie));
            return rep;
          }),
      ),
    );
  }
});
