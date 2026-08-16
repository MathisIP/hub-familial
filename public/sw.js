/*
 * Service worker de Nestync — coquille hors ligne.
 * =====================================================
 * Ce worker permet à l'app de S'OUVRIR sans réseau et d'afficher une page
 * « hors ligne » soignée au lieu de l'erreur du navigateur.
 *
 * Stratégies :
 *   · écritures (POST/…) et /api/*         → réseau direct, jamais de cache ;
 *   · fichiers statiques (hashés)          → cache d'abord (sûr, noms versionnés) ;
 *   · navigations (pages)                  → réseau d'abord, **sans jamais garder
 *                                            de copie**, repli sur /hors-ligne.
 *
 * ⚠ POURQUOI LES PAGES NE SONT PLUS MISES EN CACHE (08/08/2026).
 * Ce worker conservait le HTML de **toutes** les pages visitées, y compris
 * authentifiées : soldes bancaires, liste des documents, noms des agendas.
 * Trois conséquences, la deuxième étant la plus grave :
 *   1. après déconnexion, ces pages restaient lisibles sur l'appareil ;
 *   2. sur un appareil PARTAGÉ — le cas d'usage même d'une app de foyer — un
 *      membre pouvait retrouver les pages d'un autre ;
 *   3. des données périmées s'affichaient après un changement côté serveur
 *      (c'est ce symptôme qui a mis la puce à l'oreille : des agendas listés
 *      alors qu'ils n'étaient plus rattachés).
 * Le bénéfice, lui, était largement illusoire : les données viennent des API,
 * jamais mises en cache — une page rouverte hors ligne n'aurait montré qu'une
 * coquille vide. On échangeait donc un vrai risque de confidentialité contre
 * presque rien.
 *
 * ⚠ Le nom du cache DOIT être incrémenté à chaque changement de stratégie :
 * `activate` supprime tous les caches dont le nom diffère, ce qui purge les
 * pages déjà stockées sur les appareils. Sans ce bump, les copies existantes
 * survivraient au correctif.
 */
const CACHE = 'nestync-v3';
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

  // Navigations (pages) : réseau, et RIEN d'autre. Aucune copie n'est conservée
  // (voir l'avertissement en tête de fichier) ; sans réseau, on sert la page
  // hors-ligne, qui est publique et ne contient aucune donnée de foyer.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('/hors-ligne')));
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


/* ═══════════════════════════════════════════════════════════════════════════
   NOTIFICATIONS PUSH

   ⚠ Le contenu affiché ici est visible sur un ECRAN VERROUILLE, donc par
   quiconque tient le telephone. Le serveur n'envoie deja que des textes pauvres
   (« La liste de courses est prete »), jamais le detail : ce fichier ne fait que
   les afficher, il ne doit RIEN enrichir.

   ⚠ iOS n'accepte le push que pour une PWA ajoutee a l'ecran d'accueil
   (iOS 16.4+). Dans un onglet Safari, rien de tout ceci ne se declenche.
   ═══════════════════════════════════════════════════════════════════════════ */

self.addEventListener('push', (e) => {
  if (!e.data) return;

  let d;
  try {
    d = e.data.json();
  } catch {
    // Charge illisible : on n'affiche rien plutot qu'une notification vide,
    // qui inquieterait sans rien apprendre.
    return;
  }

  e.waitUntil(
    self.registration.showNotification(d.titre || 'Nestync', {
      body: d.corps || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      // `tag` remplace la notification precedente de meme nature au lieu de les
      // empiler : trois rappels de courses ne doivent pas faire trois lignes.
      tag: d.tag || 'nestync',
      data: { url: d.url || '/' },
      lang: 'fr',
    }),
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const cible = (e.notification.data && e.notification.data.url) || '/';

  e.waitUntil(
    (async () => {
      const fenetres = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      // Si l'app est deja ouverte, on la reutilise et on navigue : ouvrir un
      // second onglet laisserait deux etats divergents de la meme liste.
      for (const f of fenetres) {
        if ('focus' in f) {
          await f.focus();
          if ('navigate' in f) {
            try {
              await f.navigate(cible);
            } catch {
              /* navigation refusee (origine differente) : le focus suffit */
            }
          }
          return;
        }
      }
      await self.clients.openWindow(cible);
    })(),
  );
});
