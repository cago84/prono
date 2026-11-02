import { api } from '../api.js';
import { h, formatDate } from '../ui.js';

export async function renderDashboard(main) {
  main.append(h('p', { class: 'muted' }, 'Chargement…'));
  let s;
  try { s = await api.get('/api/admin/stats'); }
  catch (e) { main.replaceChildren(h('div', { class: 'error' }, e.message)); return; }

  const stat = (value, label) => h('div', { class: 'card stat' }, h('b', {}, value), h('span', { class: 'muted' }, label));
  main.replaceChildren(
    h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Tableau de bord'), h('p', { class: 'muted' }, 'Vue d’ensemble du questionnaire.'))),
    h('div', { class: 'grid' },
      stat(s.users, 'comptes actifs'), stat(s.questionnaires, 'questionnaires ouverts'), stat(s.questions, 'questions actives'),
      stat(s.participants, 'participants'), stat(`${s.participationRate} %`, 'taux de participation')),
    h('div', { class: 'card' }, h('h2', {}, 'Dernières réponses'),
      s.recent.length
        ? h('ul', { style: 'padding-left:1.1rem;margin:0' }, s.recent.map((r) =>
            h('li', {}, h('strong', {}, r.username), ` · ${r.question} `,
              h('span', { class: 'muted small' }, `(${r.version > 1 ? 'modifiée' : 'nouvelle'} le ${formatDate(r.at)})`))))
        : h('p', { class: 'empty' }, 'Aucune réponse pour le moment.')),
    h('div', { class: 'row' },
      h('a', { class: 'btn', href: '#/admin/questions' }, 'Gérer les questionnaires et questions'),
      h('a', { class: 'btn', href: '#/admin/resultats' }, 'Voir les résultats'),
      h('a', { class: 'btn', href: '#/admin/communication' }, 'Envoyer un message')));
}
