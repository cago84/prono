import { api } from '../api.js';
import { h, toast, openModal } from '../ui.js';

// Fenêtre de création / modification d'un questionnaire (le nom est obligatoire).
// onSaved(questionnaire) est appelé après succès.
export function openQuestionnaireForm(qn, onSaved) {
  const title = h('input', { type: 'text', id: 'qnt', maxLength: 150, required: true,
    placeholder: 'Ex. Enquête de satisfaction 2026' });
  title.value = qn ? qn.title : '';
  const description = h('textarea', { id: 'qnd', style: 'min-height:80px', maxLength: 1000,
    placeholder: 'Facultatif : explication affichée aux participants' });
  description.value = qn ? qn.description : '';
  const err = h('div', { class: 'error', role: 'alert', hidden: true });

  const body = h('div', {}, err,
    h('div', { class: 'field' }, h('label', { for: 'qnt' }, 'Nom du questionnaire ', h('span', { class: 'req' }, '*')), title),
    h('div', { class: 'field' }, h('label', { for: 'qnd' }, 'Description'), description));

  openModal(qn ? 'Modifier le questionnaire' : 'Nouveau questionnaire', body, [
    { label: 'Annuler', onClick: (close) => close() },
    { label: 'Enregistrer', class: 'primary', onClick: async (close) => {
      err.hidden = true;
      if (!title.value.trim()) { err.textContent = 'Le nom du questionnaire est obligatoire.'; err.hidden = false; title.focus(); return; }
      const payload = { title: title.value, description: description.value };
      try {
        const res = qn
          ? await api.put(`/api/admin/questionnaires/${qn.id}`, payload)
          : await api.post('/api/admin/questionnaires', payload);
        close();
        toast('Questionnaire enregistré ✔');
        await onSaved(res.questionnaire);
      } catch (e) { err.textContent = e.message; err.hidden = false; }
    } },
  ]);
  title.focus();
}
