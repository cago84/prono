// Service worker : permet d'ouvrir l'application hors connexion.
// - Fichiers de l'application : réseau d'abord (toujours à jour), cache en secours.
// - Supabase (autre origine) : jamais intercepté ni mis en cache (données privées, toujours fraîches).
// Les chemins sont relatifs : le site vit dans un sous-dossier sur GitHub Pages (/nom-du-depot/).
const CACHE = 'questionnaire-shell-v3';
const SHELL = [
  './', 'index.html', 'style.css', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  'vendor/supabase.js',
  'js/main.js', 'js/api.js', 'js/core.js', 'js/account.js', 'js/passwords.js', 'js/emailLinks.js',
  'js/routes.js', 'js/csv.js', 'js/config.js', 'js/ui.js',
  'js/pages/account.js', 'js/pages/adminDashboard.js', 'js/pages/adminMessages.js',
  'js/pages/adminQuestions.js', 'js/pages/adminResults.js', 'js/pages/adminUsers.js',
  'js/pages/auth.js', 'js/pages/resetPassword.js', 'js/pages/inbox.js', 'js/pages/myAnswers.js', 'js/pages/questionForm.js',
  'js/pages/questionnaire.js', 'js/pages/questionnaireForm.js', 'js/pages/questionnaireList.js',
  'js/pages/resultsByPerson.js', 'js/pages/resultsByQuestion.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // un fichier manquant ne doit pas empêcher l'installation des autres
      .then((cache) => Promise.allSettled(SHELL.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  // seulement les fichiers de l'application ; les appels à Supabase (autre origine) restent au réseau
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    try {
      const res = await fetch(req);
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    } catch {
      const cached = await caches.match(req, { ignoreSearch: true });
      if (cached) return cached;
      // navigation hors connexion : on sert la page de l'application
      if (req.mode === 'navigate') return (await caches.match('index.html')) || Response.error();
      return Response.error();
    }
  })());
});
