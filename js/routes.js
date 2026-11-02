// Correspondance entre les appels de l'interface (anciens chemins d'API) et les fonctions SQL de Supabase.
// Module pur (aucun accès réseau) : il est testé contre le vrai schéma SQL.
//
// resolve(méthode, url, corps) retourne :
//   { fn, args }        pour appeler la fonction SQL `fn` avec les arguments `args` (RPC)
//   { special, args }   pour les opérations de compte, traitées dans api.js
//   null                si le chemin est inconnu

const num = (v) => (v === undefined || v === null || v === '' ? null : Number(v));
const UUID = '([0-9a-fA-F-]{36})';

const rpc = (fn, args = {}) => ({ fn, args });

const ROUTES = [
  // ----- compte -----
  ['GET', /^\/api\/me$/, () => ({ special: 'me', args: {} })],
  ['POST', /^\/api\/auth\/login$/, (_m, _q, b) => ({ special: 'login', args: b })],
  ['POST', /^\/api\/auth\/register$/, (_m, _q, b) => ({ special: 'register', args: b })],
  ['POST', /^\/api\/auth\/logout$/, () => ({ special: 'logout', args: {} })],
  ['POST', /^\/api\/auth\/password$/, (_m, _q, b) => ({ special: 'password', args: b })],
  ['POST', /^\/api\/auth\/forgot$/, (_m, _q, b) => ({ special: 'forgot', args: b })],
  ['POST', /^\/api\/auth\/reset$/, (_m, _q, b) => ({ special: 'reset', args: b })],
  ['GET', /^\/api\/auth\/reset\/[^/]+$/, () => ({ special: 'resetCheck', args: {} })],

  // ----- utilisateur -----
  ['GET', /^\/api\/questionnaires$/, () => rpc('list_questionnaires')],
  ['GET', /^\/api\/answers$/, (_m, q) => rpc('list_answers', { p_questionnaire_id: num(q.get('questionnaireId')) })],
  ['PUT', /^\/api\/answers$/, (_m, _q, b) => rpc('save_answers', { p_answers: b.answers })],
  ['GET', /^\/api\/answers\/(\d+)\/history$/, (m) => rpc('answer_history', { p_question_id: Number(m[1]) })],
  ['GET', /^\/api\/messages$/, () => rpc('list_messages')],
  ['GET', /^\/api\/messages\/unread-count$/, () => rpc('unread_count')],
  ['POST', /^\/api\/messages\/(\d+)\/read$/, (m) => rpc('mark_message_read', { p_id: Number(m[1]) })],

  // ----- administrateur -----
  ['GET', /^\/api\/admin\/stats$/, () => rpc('admin_stats')],
  ['GET', /^\/api\/admin\/questionnaires$/, () => rpc('admin_list_questionnaires')],
  ['POST', /^\/api\/admin\/questionnaires$/, (_m, _q, b) =>
    rpc('admin_create_questionnaire', { p_title: b.title ?? '', p_description: b.description ?? '' })],
  ['PUT', /^\/api\/admin\/questionnaires\/(\d+)$/, (m, _q, b) =>
    rpc('admin_update_questionnaire', { p_id: Number(m[1]), p_title: b.title ?? '', p_description: b.description ?? '' })],
  ['POST', /^\/api\/admin\/questionnaires\/(\d+)\/archive$/, (m, _q, b) =>
    rpc('admin_archive_questionnaire', { p_id: Number(m[1]), p_archived: b.archived !== false })],

  ['GET', /^\/api\/admin\/questions$/, (_m, q) => rpc('admin_list_questions', { p_questionnaire_id: num(q.get('questionnaireId')) })],
  ['POST', /^\/api\/admin\/questions$/, (_m, _q, b) => rpc('admin_create_question', { p_payload: b })],
  ['PUT', /^\/api\/admin\/questions\/reorder$/, (_m, _q, b) => rpc('admin_reorder_questions', { p_ids: b.ids })],
  ['PUT', /^\/api\/admin\/questions\/(\d+)$/, (m, _q, b) => rpc('admin_update_question', { p_id: Number(m[1]), p_payload: b })],
  ['POST', /^\/api\/admin\/questions\/(\d+)\/archive$/, (m, _q, b) =>
    rpc('admin_archive_question', { p_id: Number(m[1]), p_archived: b.archived !== false })],

  ['GET', /^\/api\/admin\/results$/, (_m, q) => rpc('admin_results', { p_questionnaire_id: num(q.get('questionnaireId')) })],
  ['GET', /^\/api\/admin\/responses$/, () => rpc('admin_responses')],
  ['GET', new RegExp(`^/api/admin/responses/${UUID}/(\\d+)/history$`), (m) =>
    rpc('admin_response_history', { p_user_id: m[1], p_question_id: Number(m[2]) })],
  ['GET', /^\/api\/admin\/export$/, (_m, q) => rpc('admin_export', { p_questionnaire_id: num(q.get('questionnaireId')) })],

  ['GET', /^\/api\/admin\/users$/, () => rpc('admin_list_users')],
  ['PUT', new RegExp(`^/api/admin/users/${UUID}$`), (m, _q, b) =>
    rpc('admin_update_user', { p_id: m[1], p_role: b.role ?? null, p_active: b.active ?? null })],

  ['GET', /^\/api\/admin\/recipients-count$/, () => rpc('admin_recipients_count')],
  ['GET', /^\/api\/admin\/messages$/, () => rpc('admin_list_messages')],
  ['POST', /^\/api\/admin\/messages$/, (_m, _q, b) => rpc('admin_send_message', { p_subject: b.subject ?? '', p_body: b.body ?? '' })],
];

export function resolve(method, url, body = {}) {
  const u = new URL(url, 'http://local.invalid');
  for (const [m, re, build] of ROUTES) {
    if (m !== method) continue;
    const match = u.pathname.match(re);
    if (match) return build(match, u.searchParams, body || {});
  }
  return null;
}
