// Utilitaires d'interface : création d'éléments sûrs (pas de innerHTML), toasts, modales.

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k in el && k !== 'list') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

// Comme parent.append / parent.replaceChildren, mais ignorent null, undefined et false
// (sinon le navigateur écrirait littéralement "null" dans la page).
const clean = (children) => children.flat().filter((c) => c !== null && c !== undefined && c !== false);
export function add(parent, ...children) { parent.append(...clean(children)); }
export function replace(parent, ...children) { parent.replaceChildren(...clean(children)); }

export function toast(message, type = 'ok') {
  const t = h('div', { class: `toast ${type === 'error' ? 'error' : ''}`, role: 'status' }, message);
  document.getElementById('toasts').append(t);
  setTimeout(() => t.remove(), type === 'error' ? 6000 : 3500);
}

export function formatDate(iso) {
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
}

// Affichage lisible d'une valeur de réponse
export function formatValue(question, value) {
  if (value === null || value === undefined) return '—';
  if (Array.isArray(value)) return value.join(', ');
  if (question && question.type === 'rating') return '★'.repeat(value) + '☆'.repeat(5 - value) + ` (${value}/5)`;
  return String(value);
}

// Fenêtre modale générique. Retourne { dialog, close }.
export function openModal(title, content, actions = []) {
  const dialog = h('dialog', { 'aria-label': title });
  const close = () => { dialog.close(); dialog.remove(); };
  dialog.append(
    h('h2', {}, title),
    content,
    h('div', { class: 'row', style: 'justify-content:flex-end;margin-top:1rem' },
      ...actions.map((a) => h('button', { class: `btn ${a.class || ''}`, type: 'button', onclick: () => a.onClick(close) }, a.label)))
  );
  dialog.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
  document.body.append(dialog);
  dialog.showModal();
  return { dialog, close };
}

// Confirmation (retourne une Promise<boolean>)
export function confirmDialog(title, message, confirmLabel = 'Confirmer', danger = false) {
  return new Promise((resolve) => {
    openModal(title, h('p', {}, message), [
      { label: 'Annuler', onClick: (close) => { close(); resolve(false); } },
      { label: confirmLabel, class: danger ? 'danger' : 'primary', onClick: (close) => { close(); resolve(true); } },
    ]);
  });
}

// Chronologie d'un historique de réponses
export function historyTimeline(question, history) {
  if (!history.length) return h('p', { class: 'empty' }, "Aucun historique pour l'instant.");
  return h('ol', { class: 'timeline' }, history.map((e) =>
    h('li', {},
      h('strong', {}, `Version ${e.version}`), ' ', h('span', { class: 'muted small' }, formatDate(e.changedAt)),
      e.oldValue === null
        ? h('div', { class: 'diff', style: 'grid-template-columns:1fr' }, h('div', { class: 'new' }, formatValue(question, e.newValue)))
        : h('div', { class: 'diff' },
            h('div', { class: 'old' }, h('div', { class: 'small muted' }, 'Avant'), formatValue(question, e.oldValue)),
            h('div', { class: 'new' }, h('div', { class: 'small muted' }, 'Après'), formatValue(question, e.newValue))))
  ));
}
