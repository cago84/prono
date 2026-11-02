import { h } from '../ui.js';

// Statistiques par question : barres CSS pour les choix et notes, liste pour les textes libres
export function drawByQuestion(content, results) {
  if (!results.length) { content.replaceChildren(h('div', { class: 'card empty' }, 'Aucune question.')); return; }
  content.replaceChildren(...results.map((r) => {
    const q = r.question;
    const max = Math.max(1, ...(r.distribution || []).map((d) => d.count));
    return h('section', { class: 'card' },
      h('div', { class: 'small muted' }, q.questionnaireTitle),
      h('h3', {}, q.text, q.archived ? h('span', { class: 'pill warn', style: 'margin-left:.5rem' }, 'archivée') : null),
      h('div', { class: 'small muted' }, `${r.count} réponse${r.count > 1 ? 's' : ''}`
        + (r.average !== undefined && r.average !== null ? ` · moyenne ${r.average} / 5` : '')),
      r.distribution
        ? h('div', { style: 'margin-top:.5rem' }, r.distribution.map((d) =>
            h('div', { class: 'bar-row' }, h('span', { title: d.label, style: 'overflow:hidden;text-overflow:ellipsis' }, d.label),
              h('div', { class: 'bar', role: 'img', 'aria-label': `${d.label} : ${d.count}` }, h('div', { style: `width:${(d.count / max) * 100}%` })),
              h('b', {}, d.count))))
        : r.texts.length
          ? h('ul', { style: 'padding-left:1.1rem;white-space:pre-wrap' }, r.texts.map((t) => h('li', {}, t)))
          : h('p', { class: 'muted' }, 'Pas encore de réponse.'));
  }));
}
