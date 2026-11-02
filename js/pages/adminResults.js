import { api } from '../api.js';
import { h, toast } from '../ui.js';
import { buildCsv, downloadText } from '../csv.js';
import { drawByQuestion } from './resultsByQuestion.js';
import { drawByPerson } from './resultsByPerson.js';

export async function renderAdminResults(main) {
  const content = h('div');
  let tab = 'question';
  const tabs = h('div', { class: 'tabs', role: 'tablist' });

  let list = [];
  try { list = (await api.get('/api/admin/questionnaires')).questionnaires; }
  catch (e) { main.append(h('div', { class: 'error' }, e.message)); return; }

  // Filtre par questionnaire ("" = tous)
  const filter = h('select', { id: 'rqn', 'aria-label': 'Questionnaire', onchange: draw },
    h('option', { value: '' }, 'Tous les questionnaires'),
    list.map((x) => h('option', { value: x.id }, x.title + (x.archived ? ' (clôturé)' : ''))));
  const qs = () => (filter.value ? `?questionnaireId=${filter.value}` : '');
  // Le fichier est assemblé dans le navigateur à partir des données de la base
  const exportLink = h('button', { class: 'btn', type: 'button', onclick: async () => {
    try {
      downloadText('resultats.csv', buildCsv(await api.get(`/api/admin/export${qs()}`)));
    } catch (e) { toast(e.message, 'error'); }
  } }, '⬇ Exporter en CSV');

  main.append(
    h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Résultats'), h('p', { class: 'muted' }, 'Statistiques et réponses détaillées.')),
      exportLink),
    h('div', { class: 'field' }, h('label', { for: 'rqn' }, 'Questionnaire'), filter),
    tabs, content);

  async function draw() {
    tabs.replaceChildren(
      ...[['question', 'Par question'], ['person', 'Par personne']].map(([k, label]) =>
        h('button', { class: 'tab', type: 'button', role: 'tab', 'aria-selected': String(tab === k),
          onclick: () => { tab = k; draw(); } }, label)));
    content.replaceChildren(h('p', { class: 'muted' }, 'Chargement…'));
    try {
      if (tab === 'question') drawByQuestion(content, (await api.get(`/api/admin/results${qs()}`)).results);
      else {
        const [people, questions] = await Promise.all([api.get('/api/admin/responses'), api.get(`/api/admin/questions${qs()}`)]);
        drawByPerson(content, people.people, questions.questions);
      }
    } catch (e) { content.replaceChildren(h('div', { class: 'error' }, e.message)); }
  }
  await draw();
}
