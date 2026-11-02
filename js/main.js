// Point d'entrée : session, barre de navigation et routeur (hash).
import { api, setUnauthorizedHandler, takeEmailLink, confirmSignup } from './api.js';
import { h, toast, replace } from './ui.js';
import { renderAuth } from './pages/auth.js';
import { renderResetPassword } from './pages/resetPassword.js';
import { renderQuestionnaire } from './pages/questionnaire.js';
import { renderQuestionnaireList } from './pages/questionnaireList.js';
import { renderMyAnswers } from './pages/myAnswers.js';
import { renderInbox } from './pages/inbox.js';
import { renderAccount } from './pages/account.js';
import { renderDashboard } from './pages/adminDashboard.js';
import { renderAdminQuestions } from './pages/adminQuestions.js';
import { renderAdminResults } from './pages/adminResults.js';
import { renderAdminMessages } from './pages/adminMessages.js';
import { renderAdminUsers } from './pages/adminUsers.js';

const state = { user: null, unread: 0 };
const main = document.getElementById('main');
const topbar = document.getElementById('topbar');

const userRoutes = {
  '/questionnaires': ['Questionnaires', renderQuestionnaireList],
  '/reponses': ['Mes réponses', renderMyAnswers],
  '/messages': ['Messages', renderInbox],
  '/compte': ['Mon compte', renderAccount],
};
const adminRoutes = {
  '/admin': ['Tableau de bord', renderDashboard],
  '/admin/questions': ['Questions', renderAdminQuestions],
  '/admin/resultats': ['Résultats', renderAdminResults],
  '/admin/communication': ['Communication', renderAdminMessages],
  '/admin/utilisateurs': ['Utilisateurs', renderAdminUsers],
};

// Routes avec paramètre numérique : #/questionnaire/3
const dynamicRoutes = [{ prefix: '/questionnaire/', parent: '/questionnaires', title: 'Questionnaire', render: renderQuestionnaire }];

function matchDynamic(path) {
  for (const r of dynamicRoutes) {
    const m = path.startsWith(r.prefix) && path.slice(r.prefix.length).match(/^\d+$/);
    if (m) return { ...r, param: m[0] };
  }
  return null;
}

const ctx = {
  get user() { return state.user; },
  navigate: (path) => { location.hash = '#' + path; },
  refreshUnread,
  async setUser(user) {
    state.user = user;
    if (!user) { state.unread = 0; }
    else await refreshUnread(false);
    route();
  },
};

async function refreshUnread(redraw = true) {
  if (!state.user) return;
  try { state.unread = (await api.get('/api/messages/unread-count')).unread; } catch { /* ignoré */ }
  if (redraw) drawTopbar();
}

function currentPath() {
  return location.hash.replace(/^#/, '') || '/';
}

function drawTopbar() {
  const path = currentPath();
  if (!state.user) { topbar.hidden = true; return; }
  topbar.hidden = false;
  const dyn = matchDynamic(path);
  const link = ([p, [label]], extra) => {
    const active = path === p || (dyn && dyn.parent === p);
    return h('a', { class: `nav-link ${active ? 'active' : ''}`, href: '#' + p, 'aria-current': active ? 'page' : null },
      label, extra);
  };
  const isAdmin = state.user.role === 'admin';
  const links = [];
  if (isAdmin) links.push(...Object.entries(adminRoutes).map((e) => link(e)));
  links.push(...Object.entries(userRoutes).map((e) =>
    link(e, e[0] === '/messages' && state.unread > 0 ? h('span', { class: 'badge', 'aria-label': `${state.unread} non lus` }, state.unread) : null)));
  replace(topbar,
    h('span', { class: 'brand' }, '📋 Questionnaire'),
    h('nav', { 'aria-label': 'Navigation principale' }, links),
    installPrompt ? h('button', { class: 'btn small', type: 'button', onclick: installApp }, '⬇ Installer') : null,
    h('span', { class: 'who' }, `${state.user.username}${isAdmin ? ' (admin)' : ''}`),
    h('button', { class: 'btn small', type: 'button', onclick: logout }, 'Déconnexion')
  );
}

async function logout() {
  try { await api.post('/api/auth/logout'); } catch { /* ignoré */ }
  state.user = null;
  location.hash = '#/';
  route();
}

function route() {
  let path = currentPath();
  main.className = '';
  // Lien reçu par email : accessible même sans être connecté (le jeton est dans le fragment #)
  const reset = path.match(/^\/reset\/([A-Za-z0-9_%-]{20,200})$/);
  if (reset) {
    drawTopbar();
    main.replaceChildren();
    document.title = 'Nouveau mot de passe – Questionnaire';
    renderResetPassword(main, ctx, decodeURIComponent(reset[1]));
    return;
  }
  if (!state.user) {
    drawTopbar();
    main.replaceChildren();
    renderAuth(main, ctx);
    return;
  }
  const isAdmin = state.user.role === 'admin';
  const table = { ...userRoutes, ...(isAdmin ? adminRoutes : {}) };
  const dyn = matchDynamic(path);
  if (!table[path] && !dyn) {
    path = isAdmin ? '/admin' : '/questionnaires';
    history.replaceState(null, '', '#' + path);
  }
  drawTopbar();
  if (path.startsWith('/admin')) main.className = 'wide';
  main.replaceChildren();
  const target = table[path] ? { title: table[path][0], render: table[path][1] } : matchDynamic(path);
  document.title = `${target.title} – Questionnaire`;
  target.render(main, ctx, target.param);
  main.focus({ preventScroll: true });
}

setUnauthorizedHandler(() => {
  if (state.user) { state.user = null; toast('Votre session a expiré. Veuillez vous reconnecter.', 'error'); route(); }
});
window.addEventListener('hashchange', route);

// ---------- PWA : installation, mode hors connexion, service worker ----------
let installPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); // on propose notre propre bouton « Installer »
  installPrompt = e;
  drawTopbar();
});
window.addEventListener('appinstalled', () => { installPrompt = null; drawTopbar(); toast('Application installée ✔'); });

async function installApp() {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  drawTopbar();
}

const offlineBanner = h('div', { class: 'offline', role: 'status', hidden: true },
  'Vous êtes hors connexion : vos réponses ne peuvent pas être enregistrées pour le moment. Elles resteront dans votre brouillon.');
document.body.prepend(offlineBanner);
function updateOnline() { offlineBanner.hidden = navigator.onLine; }
window.addEventListener('online', () => { updateOnline(); toast('Connexion rétablie ✔'); });
window.addEventListener('offline', updateOnline);
updateOnline();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* l'appli fonctionne sans */ });
  });
}

(async () => {
  // Lien reçu par email : ?token_hash=...&type=recovery (nouveau mot de passe) ou type=signup (confirmation)
  const link = takeEmailLink();
  if (link && link.type === 'recovery') {
    location.hash = '#/reset/' + encodeURIComponent(link.token);
  } else if (link && link.type === 'signup') {
    const ok = await confirmSignup(link.token).catch(() => false);
    if (ok) toast('Adresse confirmée ✔ Bienvenue !');
    else toast('Ce lien de confirmation n\u2019est plus valide. Essayez de vous connecter ou recréez votre compte.', 'error');
  }
  try { state.user = (await api.get('/api/me')).user; } catch { state.user = null; }
  if (state.user) await refreshUnread(false);
  route();
})();
