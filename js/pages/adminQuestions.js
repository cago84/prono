import { api } from '../api.js';
import { h, toast, openModal, confirmDialog, replace } from '../ui.js';
import { answerInput } from './questionnaire.js';
import { TYPES, openQuestionForm } from './questionForm.js';
import { openQuestionnaireForm } from './questionnaireForm.js';

export async function renderAdminQuestions(main) {
  const list = h('div');
  const bar = h('div', { class: 'card' });
  let questionnaires = [];
  let current = null; // questionnaire sélectionné
  let questions = [];

  const editQuestion = (q) => openQuestionForm(q, current.id, load);
  const addBtn = h('button', { class: 'btn primary', type: 'button', onclick: () => editQuestion(null) }, '+ Nouvelle question');
  main.append(
    h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Questions'),
      h('p', { class: 'muted' }, 'Chaque question appartient à un questionnaire. Glissez-déposez (⠿) pour réordonner. Rien n\u2019est supprimé : les réponses restent conservées.')),
      addBtn),
    bar, list);

  async function loadQuestionnaires(selectId) {
    try {
      questionnaires = (await api.get('/api/admin/questionnaires')).questionnaires;
    } catch (e) { bar.replaceChildren(h('div', { class: 'error' }, e.message)); return; }
    current = questionnaires.find((x) => x.id === selectId)
      || questionnaires.find((x) => x.id === (current && current.id))
      || questionnaires.find((x) => !x.archived) || questionnaires[0] || null;
    drawBar();
    await load();
  }

  function drawBar() {
    if (!questionnaires.length) {
      addBtn.disabled = true;
      bar.replaceChildren(h('p', { style: 'margin-top:0' }, 'Commencez par créer un questionnaire : il faut lui donner un nom avant d\u2019y ajouter des questions.'),
        h('button', { class: 'btn primary', type: 'button', onclick: () => openQuestionnaireForm(null, (q) => loadQuestionnaires(q.id)) }, '+ Nouveau questionnaire'));
      return;
    }
    addBtn.disabled = !!current.archived;
    const select = h('select', { id: 'qnsel', onchange: () => { current = questionnaires.find((x) => String(x.id) === select.value); drawBar(); load(); } },
      questionnaires.map((x) => h('option', { value: x.id, selected: x.id === current.id }, x.title + (x.archived ? ' (clôturé)' : ''))));
    replace(bar,
      h('div', { class: 'field', style: 'margin-bottom:.75rem' }, h('label', { for: 'qnsel' }, 'Questionnaire'), select),
      current.description ? h('p', { class: 'muted small', style: 'white-space:pre-wrap' }, current.description) : null,
      h('div', { class: 'row' },
        h('span', { class: 'small muted' }, `${current.questionCount} question${current.questionCount > 1 ? 's' : ''} active${current.questionCount > 1 ? 's' : ''} · ${current.participantCount} participant${current.participantCount > 1 ? 's' : ''}`),
        h('span', { style: 'flex:1' }),
        h('button', { class: 'btn small', type: 'button', onclick: () => openQuestionnaireForm(null, (q) => loadQuestionnaires(q.id)) }, '+ Nouveau'),
        h('button', { class: 'btn small', type: 'button', onclick: () => openQuestionnaireForm(current, () => loadQuestionnaires(current.id)) }, 'Renommer / modifier'),
        h('button', { class: `btn small ${current.archived ? '' : 'danger'}`, type: 'button', onclick: toggleQuestionnaire }, current.archived ? 'Rouvrir' : 'Clôturer')));
  }

  async function toggleQuestionnaire() {
    if (!current.archived && !(await confirmDialog('Clôturer ce questionnaire ?',
      'Il ne sera plus proposé aux nouveaux participants et plus personne ne pourra répondre ou modifier. Les réponses et historiques sont conservés ; vous pourrez le rouvrir.', 'Clôturer', true))) return;
    try {
      await api.post(`/api/admin/questionnaires/${current.id}/archive`, { archived: !current.archived });
      toast(current.archived ? 'Questionnaire rouvert' : 'Questionnaire clôturé');
      await loadQuestionnaires(current.id);
    } catch (e) { toast(e.message, 'error'); }
  }

  async function load() {
    if (!current) { list.replaceChildren(); return; }
    try { questions = (await api.get(`/api/admin/questions?questionnaireId=${current.id}`)).questions; draw(); }
    catch (e) { list.replaceChildren(h('div', { class: 'error' }, e.message)); }
  }

  function draw() {
    if (!questions.length) { list.replaceChildren(h('div', { class: 'card empty' }, 'Aucune question. Créez la première !')); return; }
    // Dans un questionnaire clôturé, tout est en lecture seule : on ne propose pas de réordonner
    const active = questions.filter((q) => !q.archived);
    const archived = questions.filter((q) => q.archived);
    replace(list,
      ...active.map(row),
      archived.length ? h('h2', { style: 'margin-top:1.5rem' }, 'Archivées') : null,
      ...archived.map(row));
  }

  let dragId = null;
  function row(q) {
    const el = h('div', { class: 'card qitem', draggable: !q.archived,
      ondragstart: () => { dragId = q.id; el.classList.add('dragging'); },
      ondragend: () => { el.classList.remove('dragging'); },
      ondragover: (e) => e.preventDefault(),
      ondrop: (e) => { e.preventDefault(); if (dragId !== null && dragId !== q.id) move(dragId, q.id); dragId = null; } },
      q.archived ? null : h('span', { class: 'handle', 'aria-hidden': 'true', title: 'Glisser pour réordonner' }, '⠿'),
      h('div', { class: 'grow' },
        h('strong', {}, q.text), q.required ? h('span', { class: 'req' }, ' *') : null,
        h('div', { class: 'small muted' }, `${TYPES[q.type]} · ${q.answerCount} réponse${q.answerCount > 1 ? 's' : ''}`,
          q.options.length ? ` · ${q.options.join(' / ')}` : '')),
      q.archived ? null : h('button', { class: 'btn small', type: 'button', 'aria-label': 'Monter', onclick: () => step(q.id, -1) }, '↑'),
      q.archived ? null : h('button', { class: 'btn small', type: 'button', 'aria-label': 'Descendre', onclick: () => step(q.id, 1) }, '↓'),
      h('button', { class: 'btn small', type: 'button', onclick: () => preview(q) }, 'Aperçu'),
      h('button', { class: 'btn small', type: 'button', onclick: () => editQuestion(q) }, 'Modifier'),
      h('button', { class: `btn small ${q.archived ? '' : 'danger'}`, type: 'button', onclick: () => toggleArchive(q) }, q.archived ? 'Restaurer' : 'Archiver'));
    return el;
  }

  async function saveOrder(ids) {
    try { await api.put('/api/admin/questions/reorder', { ids }); } catch (e) { toast(e.message, 'error'); }
    await load();
  }
  const activeIds = () => questions.filter((q) => !q.archived).map((q) => q.id);
  function move(fromId, toId) {
    const ids = activeIds();
    ids.splice(ids.indexOf(toId), 0, ids.splice(ids.indexOf(fromId), 1)[0]);
    saveOrder(ids);
  }
  function step(id, delta) {
    const ids = activeIds(); const i = ids.indexOf(id); const j = i + delta;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    saveOrder(ids);
  }

  async function toggleArchive(q) {
    if (!q.archived && !(await confirmDialog('Archiver cette question ?',
      'Elle ne sera plus proposée aux utilisateurs. Les réponses déjà données sont conservées.', 'Archiver', true))) return;
    try {
      await api.post(`/api/admin/questions/${q.id}/archive`, { archived: !q.archived });
      toast(q.archived ? 'Question restaurée' : 'Question archivée');
      await load();
    } catch (e) { toast(e.message, 'error'); }
  }

  function preview(q) {
    openModal('Aperçu', h('div', {}, h('h3', {}, q.text, q.required ? h('span', { class: 'req' }, ' *') : null), answerInput(q, null).el),
      [{ label: 'Fermer', class: 'primary', onClick: (close) => close() }]);
  }

  await loadQuestionnaires();
}
