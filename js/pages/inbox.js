import { api } from '../api.js';
import { h, formatDate, toast } from '../ui.js';

// Boîte de réception : messages envoyés par l'administrateur
export async function renderInbox(main, ctx) {
  main.append(h('p', { class: 'muted' }, 'Chargement…'));
  let data;
  try { data = await api.get('/api/messages'); }
  catch (e) { main.replaceChildren(h('div', { class: 'error' }, e.message)); return; }

  main.replaceChildren(h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Messages'),
    h('p', { class: 'muted' }, 'Informations envoyées par l’administrateur.'))));

  if (!data.messages.length) {
    main.append(h('div', { class: 'card empty' }, 'Aucun message pour le moment.'));
    return;
  }
  for (const m of data.messages) {
    const card = h('article', { class: `card msg ${m.read ? '' : 'unread'}` },
      h('h3', {}, m.subject, m.read ? null : h('span', { class: 'pill', style: 'margin-left:.5rem' }, 'Nouveau')),
      h('div', { class: 'small muted' }, formatDate(m.createdAt)),
      h('p', { style: 'white-space:pre-wrap' }, m.body),
      m.read ? null : h('button', { class: 'btn small', type: 'button', onclick: async (e) => {
        try {
          await api.post(`/api/messages/${m.id}/read`);
          card.classList.remove('unread');
          card.querySelector('.pill')?.remove();
          e.target.remove();
          ctx.refreshUnread();
        } catch (err) { toast(err.message, 'error'); }
      } }, 'Marquer comme lu'));
    main.append(card);
  }
}
