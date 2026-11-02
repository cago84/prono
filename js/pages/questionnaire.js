import { api } from '../api.js';
import { h, toast, add } from '../ui.js';

// Champ de saisie adapté au type de question. Retourne { el, get, set, onChange }.
export function answerInput(q, initial, onChange = () => {}) {
  const name = `q${q.id}`;
  if (q.type === 'text') {
    const ta = h('textarea', { id: name, maxLength: 5000, 'aria-label': q.text, oninput: () => onChange() });
    ta.value = initial || '';
    return { el: ta, get: () => ta.value };
  }
  if (q.type === 'single' || q.type === 'multiple') {
    const multi = q.type === 'multiple';
    const inputs = q.options.map((o) => {
      const i = h('input', { type: multi ? 'checkbox' : 'radio', name, value: o, onchange: () => onChange() });
      i.checked = multi ? (initial || []).includes(o) : initial === o;
      return { i, o };
    });
    const el = h('div', { role: multi ? 'group' : 'radiogroup', 'aria-label': q.text },
      inputs.map(({ i, o }) => h('label', { class: 'option' }, i, o)));
    return { el, get: () => (multi ? inputs.filter((x) => x.i.checked).map((x) => x.o) : (inputs.find((x) => x.i.checked) || {}).o || null) };
  }
  // note de 1 à 5 : étoiles
  let value = initial || null;
  const stars = [1, 2, 3, 4, 5].map((n) => h('button', { type: 'button', class: 'star', 'aria-label': `${n} sur 5`,
    onclick: () => { value = value === n ? null : n; paint(); onChange(); } }, '★'));
  const paint = () => stars.forEach((s, i) => { s.classList.toggle('on', value !== null && i < value); s.setAttribute('aria-pressed', String(value === i + 1)); });
  paint();
  return { el: h('div', { class: 'stars', role: 'group', 'aria-label': q.text }, stars), get: () => value };
}

export const isEmpty = (v) => v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0) || (typeof v === 'string' && !v.trim());

export async function renderQuestionnaire(main, ctx, questionnaireId) {
  main.append(h('p', { class: 'muted' }, 'Chargement…'));
  let items;
  let qn;
  try {
    const [answers, list] = await Promise.all([
      api.get(`/api/answers?questionnaireId=${questionnaireId}`),
      api.get('/api/questionnaires'),
    ]);
    items = answers.items.filter((i) => !i.question.archived);
    qn = list.questionnaires.find((x) => String(x.id) === String(questionnaireId));
  } catch (e) { main.replaceChildren(h('div', { class: 'error' }, e.message)); return; }

  main.replaceChildren();
  if (!qn || qn.archived) {
    main.append(h('div', { class: 'card empty' }, h('h2', {}, 'Questionnaire indisponible'),
      h('p', {}, "Ce questionnaire n'existe pas ou est clôturé."), h('a', { class: 'btn', href: '#/questionnaires' }, '← Retour aux questionnaires')));
    return;
  }
  document.title = `${qn.title} – Questionnaire`;
  if (!items.length) {
    main.append(h('p', {}, h('a', { href: '#/questionnaires' }, '← Tous les questionnaires')),
      h('div', { class: 'card empty' }, h('h2', {}, qn.title), h('p', {}, "Ce questionnaire ne contient pas encore de question. Revenez bientôt !")));
    return;
  }

  // Brouillon local (par questionnaire) : conservé si l'onglet est fermé avant l'enregistrement
  const draftKey = `draft:${ctx.user.id}:${questionnaireId}`;
  let draft = {};
  try { draft = JSON.parse(localStorage.getItem(draftKey) || '{}'); } catch { draft = {}; }
  const hadDraft = Object.keys(draft).length > 0;

  const progressBar = h('div', { style: 'width:0%' });
  const progressText = h('span', { class: 'small muted' });
  const rows = items.map(({ question: q, answer }) => {
    const initial = Object.hasOwn(draft, q.id) ? draft[q.id] : answer ? answer.value : null;
    const err = h('div', { class: 'field-error', role: 'alert', hidden: true });
    const input = answerInput(q, initial, () => { saveDraft(); update(); err.hidden = true; });
    const card = h('section', { class: 'card field' },
      h('h3', {}, q.text, q.required ? h('span', { class: 'req', title: 'Obligatoire' }, ' *') : h('span', { class: 'muted small' }, ' (facultatif)')),
      answer ? h('div', { class: 'hint' }, `Déjà répondu (version ${answer.version}) – vous pouvez modifier.`) : null,
      input.el, err);
    return { q, input, err, card, saved: answer ? answer.value : null };
  });

  function saveDraft() {
    const d = {};
    rows.forEach((r) => { const v = r.input.get(); if (JSON.stringify(v) !== JSON.stringify(r.saved)) d[r.q.id] = v; });
    if (Object.keys(d).length) localStorage.setItem(draftKey, JSON.stringify(d)); else localStorage.removeItem(draftKey);
  }
  function update() {
    const done = rows.filter((r) => !isEmpty(r.input.get())).length;
    progressBar.style.width = `${Math.round((done / rows.length) * 100)}%`;
    progressText.textContent = `${done} / ${rows.length} question${rows.length > 1 ? 's' : ''} répondue${done > 1 ? 's' : ''}`;
  }

  const saveBtn = h('button', { class: 'btn primary', type: 'button', onclick: save }, 'Enregistrer mes réponses');
  async function save() {
    let firstError = null;
    rows.forEach((r) => {
      r.err.hidden = true;
      if (r.q.required && isEmpty(r.input.get())) {
        r.err.textContent = 'Cette question est obligatoire.'; r.err.hidden = false; firstError ||= r.card;
      }
    });
    if (firstError) { firstError.scrollIntoView({ behavior: 'smooth', block: 'center' }); toast('Certaines questions obligatoires sont vides.', 'error'); return; }
    const answers = {};
    rows.forEach((r) => { const v = r.input.get(); if (!isEmpty(v)) answers[r.q.id] = v; });
    saveBtn.disabled = true;
    try {
      const res = await api.put('/api/answers', { answers });
      localStorage.removeItem(draftKey);
      toast(res.changed ? 'Réponses enregistrées ✔' : 'Aucune modification à enregistrer.');
      ctx.navigate('/reponses');
    } catch (e) { toast(e.message, 'error'); saveBtn.disabled = false; }
  }

  add(main,
    h('p', {}, h('a', { href: '#/questionnaires' }, '← Tous les questionnaires')),
    h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, qn.title),
      qn.description ? h('p', { style: 'white-space:pre-wrap' }, qn.description) : null,
      h('p', { class: 'muted' }, 'Vos réponses restent modifiables ; chaque modification est historisée.'))),
    hadDraft ? h('div', { class: 'card', style: 'background:var(--warn-soft)' }, '📝 Votre brouillon non enregistré a été restauré.') : null,
    h('div', { class: 'progress', role: 'progressbar', 'aria-label': 'Progression' }, progressBar),
    ...rows.map((r) => r.card),
    h('div', { class: 'savebar' }, progressText, saveBtn));
  update();
}
