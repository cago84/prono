import { api } from '../api.js';
import { h, toast, formatDate, confirmDialog } from '../ui.js';

export async function renderAdminMessages(main) {
  const subject = h('input', { type: 'text', id: 'subj', maxLength: 200 });
  const body = h('textarea', { id: 'body', style: 'min-height:160px' });
  const emailBox = h('input', { type: 'checkbox', id: 'mail' });
  const err = h('div', { class: 'error', role: 'alert', hidden: true });
  const history = h('div');
  const emailRow = h('label', { class: 'option', hidden: true }, emailBox, 'Envoyer aussi par email');

  const send = h('button', { class: 'btn primary', type: 'submit' }, 'Envoyer à tous');
  const form = h('form', { class: 'card', novalidate: true, onsubmit: async (e) => {
    e.preventDefault(); err.hidden = true;
    if (!subject.value.trim() || !body.value.trim()) { err.textContent = 'Le sujet et le message sont obligatoires.'; err.hidden = false; return; }
    let count = 0;
    try { count = (await api.get('/api/admin/recipients-count')).count; } catch (ex) { toast(ex.message, 'error'); return; }
    if (!(await confirmDialog('Envoyer ce message ?', `Il sera envoyé à ${count} personne${count > 1 ? 's' : ''}.`, 'Envoyer'))) return;
    send.disabled = true;
    try {
      const r = await api.post('/api/admin/messages', { subject: subject.value, body: body.value, sendEmail: emailBox.checked });
      toast(`Message envoyé à ${r.recipients} personne${r.recipients > 1 ? 's' : ''} ✔`);
      subject.value = ''; body.value = '';
      await loadHistory();
    } catch (ex) { err.textContent = ex.message; err.hidden = false; }
    send.disabled = false;
  } },
    h('h2', {}, 'Nouveau message'),
    h('p', { class: 'muted small' }, 'Le message apparaît dans la boîte de réception de chaque compte actif.'),
    err,
    h('div', { class: 'field' }, h('label', { for: 'subj' }, 'Sujet'), subject),
    h('div', { class: 'field' }, h('label', { for: 'body' }, 'Message'), body),
    emailRow, h('div', { style: 'margin-top:1rem' }, send));

  main.append(h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Communication'),
    h('p', { class: 'muted' }, 'Écrivez à toutes les personnes ayant un compte.'))), form,
    h('h2', {}, 'Messages envoyés'), history);

  async function loadHistory() {
    try {
      const d = await api.get('/api/admin/messages');
      emailRow.hidden = !d.emailEnabled;
      history.replaceChildren(...(d.messages.length ? d.messages.map((m) =>
        h('article', { class: 'card' }, h('h3', {}, m.subject),
          h('div', { class: 'small muted' }, `${formatDate(m.createdAt)} · par ${m.author} · ${m.recipientCount} destinataire${m.recipientCount > 1 ? 's' : ''} · ${m.readCount} lu${m.readCount > 1 ? 's' : ''}`
            + (m.emailedCount ? ` · ${m.emailedCount} email${m.emailedCount > 1 ? 's' : ''}` : '')),
          h('p', { style: 'white-space:pre-wrap' }, m.body))) : [h('div', { class: 'card empty' }, 'Aucun message envoyé.')]));
    } catch (e) { history.replaceChildren(h('div', { class: 'error' }, e.message)); }
  }
  await loadHistory();
}
