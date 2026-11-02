import { api } from '../api.js';
import { h, toast, formatValue, formatDate, openModal, historyTimeline } from '../ui.js';

// Réponses par personne, avec recherche et accès à l'historique de chaque réponse
export function drawByPerson(content, people, questions) {
  const search = h('input', { type: 'text', placeholder: 'Rechercher un identifiant ou un email…', 'aria-label': 'Rechercher', oninput: draw });
  const list = h('div');
  content.replaceChildren(h('div', { class: 'field' }, search), list);

  async function showHistory(person, q) {
    try {
      const { history } = await api.get(`/api/admin/responses/${person.id}/${q.id}/history`);
      openModal(`${person.username} : ${q.text}`, historyTimeline(q, history), [{ label: 'Fermer', class: 'primary', onClick: (close) => close() }]);
    } catch (e) { toast(e.message, 'error'); }
  }

  function draw() {
    const term = search.value.trim().toLowerCase();
    const rows = people.filter((p) => !term || p.username.toLowerCase().includes(term) || p.email.toLowerCase().includes(term));
    if (!rows.length) { list.replaceChildren(h('div', { class: 'card empty' }, 'Aucune personne trouvée.')); return; }
    list.replaceChildren(...rows.map((p) => {
      const answered = questions.filter((q) => p.answers[q.id]).length;
      return h('details', { class: 'card' },
        h('summary', { style: 'cursor:pointer' }, h('strong', {}, p.username), ` · ${p.email} `,
          h('span', { class: 'pill' }, `${answered} / ${questions.length} réponses`)),
        h('div', { class: 'table-wrap', style: 'margin-top:.75rem' }, h('table', {}, h('tbody', {},
          questions.map((q) => {
            const a = p.answers[q.id];
            return h('tr', {}, h('td', { style: 'width:40%' }, q.text),
              h('td', { style: 'white-space:pre-wrap' }, a ? formatValue(q, a.value) : h('span', { class: 'muted' }, '—'),
                a ? h('div', { class: 'small muted' }, `v${a.version} · ${formatDate(a.updatedAt)}`) : null),
              h('td', {}, a ? h('button', { class: 'btn small', type: 'button', onclick: () => showHistory(p, q) }, 'Historique') : null));
          })))));
    }));
  }
  draw();
}
