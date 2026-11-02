import { api } from '../api.js';
import { h, replace } from '../ui.js';

// Écran unique à onglets : connexion / création de compte, avec « mot de passe oublié »
export function renderAuth(main, ctx) {
  let mode = 'login'; // 'login' | 'register' | 'forgot'
  const card = h('div', { class: 'card auth' });
  main.append(h('div', { class: 'auth' }, h('h1', { style: 'text-align:center' }, '📋 Questionnaire'),
    h('p', { class: 'muted', style: 'text-align:center' }, 'Connectez-vous pour répondre et retrouver vos réponses.')), card);

  const tab = (m, label) => h('button', { class: 'tab', type: 'button', role: 'tab', 'aria-selected': String(mode === m),
    onclick: () => { mode = m; draw(); } }, label);
  const showError = (box, msg) => { box.textContent = msg; box.hidden = false; };

  function passwordField(id, autocomplete, hint) {
    const input = h('input', { type: 'password', id, required: true, autocomplete });
    const toggle = h('button', { class: 'btn small', type: 'button', 'aria-label': 'Afficher ou masquer le mot de passe',
      onclick: () => { input.type = input.type === 'password' ? 'text' : 'password'; toggle.textContent = input.type === 'password' ? '👁' : '🙈'; } }, '👁');
    return { input, el: h('div', { class: 'field' }, h('label', { for: id }, 'Mot de passe'),
      h('div', { class: 'pw' }, input, toggle), hint ? h('div', { class: 'hint' }, hint) : null) };
  }

  function draw() {
    if (mode === 'forgot') return drawForgot();
    const isLogin = mode === 'login';
    const errorBox = h('div', { class: 'error', role: 'alert', hidden: true });
    // Connexion : un seul champ accepte l'email OU l'identifiant. Inscription : identifiant + email séparés.
    const username = h('input', { type: 'text', id: 'username', autocomplete: 'username', autocapitalize: 'none',
      spellcheck: false, maxLength: 30, required: true });
    const email = h('input', { type: isLogin ? 'text' : 'email', id: 'email', autocomplete: isLogin ? 'username' : 'email',
      autocapitalize: 'none', spellcheck: false, required: true });
    const pw = passwordField('password', isLogin ? 'current-password' : 'new-password', isLogin ? null : '8 caractères minimum.');
    const submit = h('button', { class: 'btn primary', type: 'submit', style: 'width:100%' }, isLogin ? 'Se connecter' : 'Créer mon compte');

    const form = h('form', {
      novalidate: true,
      onsubmit: async (e) => {
        e.preventDefault();
        errorBox.hidden = true;
        if ((!isLogin && !username.value.trim()) || !email.value.trim() || !pw.input.value) {
          return showError(errorBox, 'Veuillez remplir tous les champs.');
        }
        submit.disabled = true;
        try {
          const body = isLogin
            ? { login: email.value, password: pw.input.value }
            : { username: username.value, email: email.value, password: pw.input.value };
          const { user } = await api.post(isLogin ? '/api/auth/login' : '/api/auth/register', body);
          await ctx.setUser(user);
          ctx.navigate(user.role === 'admin' ? '/admin' : '/questionnaires');
        } catch (err) {
          if (err.status === 202) { // compte créé, adresse à confirmer par email
            replace(card, h('h2', {}, 'Vérifiez vos emails'), h('p', {}, err.message),
              h('button', { class: 'btn', type: 'button', onclick: () => { mode = 'login'; draw(); } }, '← Retour à la connexion'));
            return;
          }
          showError(errorBox, err.message); submit.disabled = false;
        }
      },
    },
      errorBox,
      isLogin ? null : h('div', { class: 'field' }, h('label', { for: 'username' }, 'Identifiant'), username,
        h('div', { class: 'hint' }, '3 à 30 caractères : lettres, chiffres, point, tiret, underscore. Sert à vous connecter.')),
      h('div', { class: 'field' }, h('label', { for: 'email' }, isLogin ? 'Email ou identifiant' : 'Adresse email'), email),
      pw.el,
      submit,
      isLogin ? h('p', { style: 'text-align:center;margin:1rem 0 0' },
        h('a', { href: '#/', onclick: (e) => { e.preventDefault(); mode = 'forgot'; draw(); } }, 'Mot de passe oublié ?')) : null);

    replace(card, h('div', { class: 'tabs', role: 'tablist' }, tab('login', 'Connexion'), tab('register', 'Créer un compte')), form);
    (isLogin ? email : username).focus();
  }

  function drawForgot() {
    const errorBox = h('div', { class: 'error', role: 'alert', hidden: true });
    const login = h('input', { type: 'text', id: 'flogin', autocomplete: 'username', autocapitalize: 'none', spellcheck: false, required: true });
    const submit = h('button', { class: 'btn primary', type: 'submit', style: 'width:100%' }, 'Envoyer le lien');
    const back = () => { mode = 'login'; draw(); };

    const form = h('form', {
      novalidate: true,
      onsubmit: async (e) => {
        e.preventDefault();
        errorBox.hidden = true;
        if (!login.value.trim()) return showError(errorBox, 'Indiquez votre adresse email ou votre identifiant.');
        submit.disabled = true;
        try {
          await api.post('/api/auth/forgot', { login: login.value });
          // même message que le compte existe ou non
          replace(card,
            h('h2', {}, 'Vérifiez vos emails'),
            h('p', {}, 'Si un compte correspond à cette adresse ou à cet identifiant, un lien de réinitialisation vient d\u2019être envoyé. Il est valable 1 heure.'),
            h('p', { class: 'muted small' }, 'Rien reçu ? Regardez dans vos courriers indésirables, ou refaites une demande dans quelques minutes.'),
            h('button', { class: 'btn', type: 'button', onclick: back }, '← Retour à la connexion'));
        } catch (err) { showError(errorBox, err.message); submit.disabled = false; }
      },
    },
      errorBox,
      h('div', { class: 'field' }, h('label', { for: 'flogin' }, 'Email ou identifiant'), login,
        h('div', { class: 'hint' }, 'Nous vous enverrons un lien pour choisir un nouveau mot de passe.')),
      submit);

    replace(card, h('h2', {}, 'Mot de passe oublié'), form,
      h('p', { style: 'text-align:center;margin:1rem 0 0' }, h('a', { href: '#/', onclick: (e) => { e.preventDefault(); back(); } }, '← Retour à la connexion')));
    login.focus();
  }

  draw();
}
