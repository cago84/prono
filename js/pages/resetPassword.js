import { api } from '../api.js';
import { h, replace } from '../ui.js';

// Page ouverte depuis le lien reçu par email : #/reset/<jeton>
export async function renderResetPassword(main, ctx, token) {
  const card = h('div', { class: 'card auth' });
  main.append(h('div', { class: 'auth' }, h('h1', { style: 'text-align:center' }, '📋 Questionnaire')), card);
  const goLogin = () => ctx.navigate('/');

  replace(card, h('p', { class: 'muted' }, 'Vérification du lien…'));
  try { await api.get(`/api/auth/reset/${encodeURIComponent(token)}`); }
  catch (e) {
    replace(card, h('h2', {}, 'Lien invalide'), h('div', { class: 'error', role: 'alert' }, e.message),
      h('button', { class: 'btn primary', type: 'button', onclick: goLogin }, 'Retour à la connexion'));
    return;
  }

  const errorBox = h('div', { class: 'error', role: 'alert', hidden: true });
  const pwd = h('input', { type: 'password', id: 'npw', required: true, autocomplete: 'new-password' });
  const confirm = h('input', { type: 'password', id: 'npw2', required: true, autocomplete: 'new-password' });
  const toggle = h('button', { class: 'btn small', type: 'button', 'aria-label': 'Afficher ou masquer les mots de passe',
    onclick: () => { const t = pwd.type === 'password' ? 'text' : 'password'; pwd.type = t; confirm.type = t; toggle.textContent = t === 'password' ? '👁' : '🙈'; } }, '👁');
  const submit = h('button', { class: 'btn primary', type: 'submit', style: 'width:100%' }, 'Enregistrer le nouveau mot de passe');

  replace(card, h('h2', {}, 'Nouveau mot de passe'),
    h('form', {
      novalidate: true,
      onsubmit: async (e) => {
        e.preventDefault();
        errorBox.hidden = true;
        if (pwd.value.length < 8) { errorBox.textContent = 'Ce mot de passe est trop court (8 caractères minimum).'; errorBox.hidden = false; return; }
        if (pwd.value !== confirm.value) { errorBox.textContent = 'Les deux mots de passe ne sont pas identiques.'; errorBox.hidden = false; return; }
        submit.disabled = true;
        try {
          await api.post('/api/auth/reset', { token, password: pwd.value });
          replace(card, h('h2', {}, 'Mot de passe modifié ✔'),
            h('p', {}, 'Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.'),
            h('button', { class: 'btn primary', type: 'button', onclick: goLogin }, 'Se connecter'));
        } catch (err) {
          errorBox.textContent = err.message; errorBox.hidden = false; submit.disabled = false;
        }
      },
    },
      errorBox,
      h('div', { class: 'field' }, h('label', { for: 'npw' }, 'Nouveau mot de passe'), h('div', { class: 'pw' }, pwd, toggle), h('div', { class: 'hint' }, '8 caractères minimum.')),
      h('div', { class: 'field' }, h('label', { for: 'npw2' }, 'Confirmer le mot de passe'), confirm),
      submit));
  pwd.focus();
}
