import { api } from '../api.js';
import { h, toast, openModal } from '../ui.js';

export const TYPES = { text: 'Texte libre', single: 'Choix unique', multiple: 'Choix multiple', rating: 'Note (1 à 5)' };

// Fenêtre de création / modification d'une question. onSaved() est appelé après succès.
export function openQuestionForm(q, questionnaireId, onSaved) {
  const locked = !!(q && q.answerCount);
  const text = h('textarea', { id: 'qt', style: 'min-height:70px', maxLength: 500 });
  text.value = q ? q.text : '';
  const type = h('select', { id: 'qty', disabled: locked },
    Object.entries(TYPES).map(([v, l]) => h('option', { value: v, selected: q ? q.type === v : v === 'text' }, l)));
  const options = h('textarea', { id: 'qo', style: 'min-height:90px' });
  options.value = q ? q.options.join('\n') : '';
  const optField = h('div', { class: 'field' }, h('label', { for: 'qo' }, 'Options (une par ligne)'), options,
    locked ? h('div', { class: 'hint' }, 'Vous pouvez ajouter des options, mais pas en retirer.') : null);
  const required = h('input', { type: 'checkbox', id: 'qr' });
  required.checked = q ? q.required : false;
  const err = h('div', { class: 'error', role: 'alert', hidden: true });
  const sync = () => { optField.hidden = !['single', 'multiple'].includes(type.value); };
  type.addEventListener('change', sync);
  sync();

  const body = h('div', {}, err,
    h('div', { class: 'field' }, h('label', { for: 'qt' }, 'Question'), text),
    h('div', { class: 'field' }, h('label', { for: 'qty' }, 'Type de réponse'), type,
      locked ? h('div', { class: 'hint' }, 'Le type ne peut plus changer : des réponses existent.') : null),
    optField,
    h('label', { class: 'option' }, required, 'Réponse obligatoire'));

  openModal(q ? 'Modifier la question' : 'Nouvelle question', body, [
    { label: 'Annuler', onClick: (close) => close() },
    { label: 'Enregistrer', class: 'primary', onClick: async (close) => {
      const payload = { questionnaireId, text: text.value, type: locked ? q.type : type.value, required: required.checked, options: options.value.split('\n') };
      try {
        if (q) await api.put(`/api/admin/questions/${q.id}`, payload);
        else await api.post('/api/admin/questions', payload);
        close();
        toast('Question enregistrée ✔');
        await onSaved();
      } catch (e) { err.textContent = e.message; err.hidden = false; }
    } },
  ]);
  text.focus();
}
