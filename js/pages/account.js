import { api } from '../api.js';
import { h, toast } from '../ui.js';

export function renderAccount(main, ctx) {
  const current = h('input', { type: 'password', id: 'cur', autocomplete: 'current-password' });
  const next = h('input', { type: 'password', id: 'new', autocomplete: 'new-password' });
  const err = h('div', { class: 'error', role: 'alert', hidden: true });
  main.append(
    h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Mon compte'),
      h('p', { class: 'muted' }, `Identifiant : ${ctx.user.username} · ${ctx.user.email}`))),
    h('form', { class: 'card', novalidate: true, onsubmit: async (e) => {
      e.preventDefault(); err.hidden = true;
      try {
        await api.post('/api/auth/password', { current: current.value, password: next.value });
        current.value = ''; next.value = '';
        toast('Mot de passe modifié ✔');
      } catch (ex) { err.textContent = ex.message; err.hidden = false; }
    } },
      h('h2', {}, 'Changer de mot de passe'), err,
      h('div', { class: 'field' }, h('label', { for: 'cur' }, 'Mot de passe actuel'), current),
      h('div', { class: 'field' }, h('label', { for: 'new' }, 'Nouveau mot de passe'), next, h('div', { class: 'hint' }, '8 caractères minimum.')),
      h('button', { class: 'btn primary', type: 'submit' }, 'Modifier le mot de passe')));
}
