import { api } from '../api.js';
import { h, toast, formatDate, confirmDialog } from '../ui.js';

export async function renderAdminUsers(main, ctx) {
  const search = h('input', { type: 'text', placeholder: 'Rechercher un identifiant ou un email…', 'aria-label': 'Rechercher', oninput: draw });
  const tbody = h('tbody');
  let users = [];
  main.append(
    h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Utilisateurs'), h('p', { class: 'muted' }, 'Gérez les comptes et les droits.'))),
    h('div', { class: 'field' }, search),
    h('div', { class: 'card table-wrap' }, h('table', {},
      h('thead', {}, h('tr', {}, ['Identifiant', 'Email', 'Rôle', 'Réponses', 'Inscrit le', 'Actions'].map((t) => h('th', {}, t)))), tbody)));

  async function load() {
    try { users = (await api.get('/api/admin/users')).users; draw(); }
    catch (e) { tbody.replaceChildren(h('tr', {}, h('td', { colSpan: 6 }, e.message))); }
  }

  async function update(u, patch, message) {
    try { await api.put(`/api/admin/users/${u.id}`, patch); toast(message); await load(); }
    catch (e) { toast(e.message, 'error'); }
  }

  function draw() {
    const term = search.value.trim().toLowerCase();
    const rows = users.filter((u) => !term || u.username.toLowerCase().includes(term) || u.email.toLowerCase().includes(term));
    tbody.replaceChildren(...rows.map((u) => {
      const me = u.id === ctx.user.id;
      return h('tr', {},
        h('td', {}, u.username, me ? h('span', { class: 'pill', style: 'margin-left:.4rem' }, 'vous') : null,
          u.active ? null : h('span', { class: 'pill warn', style: 'margin-left:.4rem' }, 'désactivé')),
        h('td', {}, u.email),
        h('td', {}, u.role === 'admin' ? 'Administrateur' : 'Utilisateur'),
        h('td', {}, u.answerCount),
        h('td', {}, formatDate(u.createdAt)),
        h('td', {}, me ? h('span', { class: 'muted small' }, '—') : h('div', { class: 'row' },
          h('button', { class: 'btn small', type: 'button', onclick: async () => {
            const to = u.role === 'admin' ? 'user' : 'admin';
            if (await confirmDialog('Changer le rôle ?', `${u.username} deviendra ${to === 'admin' ? 'administrateur' : 'simple utilisateur'}.`))
              update(u, { role: to }, 'Rôle modifié ✔');
          } }, u.role === 'admin' ? 'Retirer admin' : 'Passer admin'),
          h('button', { class: `btn small ${u.active ? 'danger' : ''}`, type: 'button', onclick: async () => {
            if (!u.active || await confirmDialog('Désactiver ce compte ?', `${u.username} ne pourra plus se connecter. Ses réponses sont conservées.`, 'Désactiver', true))
              update(u, { active: !u.active }, u.active ? 'Compte désactivé' : 'Compte réactivé ✔');
          } }, u.active ? 'Désactiver' : 'Réactiver'))));
    }));
  }
  await load();
}
