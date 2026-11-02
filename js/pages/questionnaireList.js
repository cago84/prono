import { api } from '../api.js';
import { h } from '../ui.js';

// Liste des questionnaires : l'utilisateur choisit celui auquel il répond
export async function renderQuestionnaireList(main) {
  main.append(h('p', { class: 'muted' }, 'Chargement…'));
  let list;
  try { list = (await api.get('/api/questionnaires')).questionnaires; }
  catch (e) { main.replaceChildren(h('div', { class: 'error' }, e.message)); return; }

  main.replaceChildren(h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Questionnaires'),
    h('p', { class: 'muted' }, 'Choisissez un questionnaire pour y répondre ou modifier vos réponses.'))));

  if (!list.length) {
    main.append(h('div', { class: 'card empty' }, h('h2', {}, 'Aucun questionnaire pour le moment'),
      h('p', {}, "L'administrateur n'a pas encore publié de questionnaire. Revenez bientôt !")));
    return;
  }

  for (const qn of list) {
    const done = qn.answeredCount;
    const total = qn.questionCount;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const status = qn.archived ? 'Clôturé' : done === 0 ? 'Pas commencé' : done >= total ? 'Terminé' : 'En cours';
    main.append(h('section', { class: 'card' },
      h('div', { class: 'row', style: 'justify-content:space-between' },
        h('h2', { style: 'margin:0' }, qn.title),
        h('span', { class: `pill ${qn.archived ? 'warn' : ''}` }, status)),
      qn.description ? h('p', { class: 'muted', style: 'white-space:pre-wrap' }, qn.description) : null,
      h('div', { class: 'progress', role: 'progressbar', 'aria-label': `Progression : ${qn.title}`,
        'aria-valuenow': String(pct), 'aria-valuemin': '0', 'aria-valuemax': '100' }, h('div', { style: `width:${pct}%` })),
      h('div', { class: 'row', style: 'justify-content:space-between' },
        h('span', { class: 'small muted' }, `${done} / ${total} question${total > 1 ? 's' : ''} répondue${done > 1 ? 's' : ''}`),
        h('div', { class: 'row' },
          qn.hasAnswers ? h('a', { class: 'btn small', href: '#/reponses' }, 'Mes réponses') : null,
          qn.archived ? null : h('a', { class: 'btn small primary', href: `#/questionnaire/${qn.id}` }, done ? 'Continuer / modifier' : 'Répondre')))));
  }
}
