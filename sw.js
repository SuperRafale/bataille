/* SUPER RAFALE · SERVICE WORKER · BUILD 2.98
   Mode hors ligne pour le jeu publié sur un serveur web (GitHub Pages…).
   Le jeu est un fichier unique (index.html), mis en cache à l'installation.

   STRATÉGIE — RÉSEAU D'ABORD (network-first) :
     · tant que le réseau répond, chaque requête part en ligne → la version
       fraîche s'affiche toujours et le cache est rafraîchi au passage ;
     · si le réseau échoue, la réponse vient du cache → l'adresse du jeu
       reste jouable sans connexion ;
     · tout ce qui n'est PAS du même site (Hall of Fame api.jsonbin.io,
       polices distantes…) n'est JAMAIS intercepté : pas de score fabriqué
       ni de donnée périmée.

   NOUVELLE VERSION : à chaque publication, incrémenter SW_VERSION ci-
   dessous (même numéro que le BUILD du jeu) → le navigateur détecte le
   sw.js modifié, l'installe, purge l'ancien cache à l'activation. */

const SW_VERSION = 'superrafale-v2.98';
const PRECACHE = ['./'];

/* INSTALLATION : précache du jeu, puis prise de service
   immédiate (skipWaiting) pour couvrir l'onglet dès la 1re visite. */
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(SW_VERSION)
      .then(c => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

/* ACTIVATION : purge des caches des anciennes versions + prise en main
   des onglets déjà ouverts (clients.claim). */
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== SW_VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* INTERCEPTION DES REQUÊTES : réseau d'abord, cache en secours. */
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                       /* PUT scores… : jamais touchés */
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;        /* JSONBin, polices… : jamais interceptés */
  e.respondWith(
    fetch(req).then((res) => {
      if (res && res.ok) {                                /* succès réseau → rafraîchit le cache */
        const copy = res.clone();
        caches.open(SW_VERSION).then(c => c.put(req, copy)).catch(() => {});
      }
      return res;
    }).catch(() =>
      caches.match(req, { ignoreSearch: true })           /* hors ligne → le cache répond */
        .then(r => r || caches.match('./', { ignoreSearch: true }))
        .then(r => r || Response.error())
    )
  );
});
