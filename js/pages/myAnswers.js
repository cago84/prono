import { api } from '../api.js';
import { h, toast, formatDate, formatValue, openModal, historyTimeline } from '../ui.js';
import { answerInput, isEmpty } from './questionnaire.js';

// Revoir ses réponses, les modifier (avec historique) et consulter les versions précédentes
export async function renderMyAnswers(main, ctx) {
  main.append(h('p', { class: 'muted' }, 'Chargement…'));
  let items;
  let titles = new Map();
  try {
    const [answers, list] = await Promise.all([api.get('/api/answers'), api.get('/api/questionnaires')]);
    items = answers.items;
    titles = new Map(list.questionnaires.map((x) => [x.id, x.title]));
  } catch (e) { main.replaceChildren(h('div', { class: 'error' }, e.message)); return; }

  const answered = items.filter((i) => i.answer).length;
  main.replaceChildren(h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Mes réponses'),
    h('p', { class: 'muted' }, `${answered} réponse${answered > 1 ? 's' : ''} enregistrée${answered > 1 ? 's' : ''}`))));

  if (!items.length) {
    main.append(h('div', { class: 'card empty' }, 'Aucune question disponible.'));
    return;
  }

  // Les réponses sont groupées sous le nom de leur questionnaire
  let currentQn = null;
  for (const item of items) {
    if (item.question.questionnaireId !== currentQn) {
      currentQn = item.question.questionnaireId;
      main.append(h('h2', { style: 'margin:1.5rem 0 .75rem' }, titles.get(currentQn) || 'Questionnaire'));
    }
    main.append(card(item));
  }

  function card(item) {
    const q = item.question;
    const box = h('section', { class: 'card' });

    function viewMode() {
      const a = item.answer;
      box.replaceChildren(
        h('h3', {}, q.text, q.archived ? h('span', { class: 'pill warn', style: 'margin-left:.5rem' }, 'Question clôturée') : null),
        a ? h('div', { class: 'answer-view' }, formatValue(q, a.value))
          : h('p', { class: 'muted' }, 'Pas encore de réponse.'),
        h('div', { class: 'row' },
          a ? h('span', { class: 'small muted' }, `Version ${a.version} · modifiée le ${formatDate(a.updatedAt)}`) : null,
          h('span', { style: 'flex:1' }),
          a ? h('button', { class: 'btn small', type: 'button', onclick: () => showHistory(q) }, '🕘 Voir l’historique') : null,
          q.archived ? null : h('button', { class: 'btn small primary', type: 'button', onclick: editMode }, a ? 'Modifier' : 'Répondre'))
      );
    }

    function editMode() {
      const input = answerInput(q, item.answer ? item.answer.value : null);
      const err = h('div', { class: 'field-error', role: 'alert', hidden: true });
      const save = h('button', { class: 'btn small primary', type: 'button', onclick: async () => {
        const v = input.get();
        if (q.required && isEmpty(v)) { err.textContent = 'Cette question est obligatoire.'; err.hidden = false; return; }
        if (isEmpty(v)) { viewMode(); return; }
        save.disabled = true;
        try {
          const res = await api.put('/api/answers', { answers: { [q.id]: v } });
          toast(res.changed ? 'Réponse modifiée ✔ (ancienne version conservée dans l’historique)' : 'Aucune modification.');
          const fresh = (await api.get('/api/answers')).items.find((i) => i.question.id === q.id);
          item.answer = fresh.answer;
          viewMode();
        } catch (e) { toast(e.message, 'error'); save.disabled = false; }
      } }, 'Enregistrer');
      box.replaceChildren(h('h3', {}, q.text), input.el, err,
        h('div', { class: 'row', style: 'margin-top:.75rem' },
          save, h('button', { class: 'btn small', type: 'button', onclick: viewMode }, 'Annuler')));
    }

    viewMode();
    return box;
  }

  async function showHistory(q) {
    try {
      const { history } = await api.get(`/api/answers/${q.id}/history`);
      openModal(`Historique : ${q.text}`, historyTimeline(q, history), [{ label: 'Fermer', class: 'primary', onClick: (close) => close() }]);
    } catch (e) { toast(e.message, 'error'); }
  }
}
