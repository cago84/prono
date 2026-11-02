// Appels de l'interface : api.get('/api/...') comme avant. routes.js les traduit en fonctions SQL
// de Supabase (RPC) ou en opérations de compte (account.js).
import { ApiError, callRpc } from './core.js';
import { account } from './account.js';
import { resolve } from './routes.js';

export { ApiError, setUnauthorizedHandler } from './core.js';
export { takeEmailLink, confirmSignup } from './emailLinks.js';

async function request(method, url, body) {
  const route = resolve(method, url, body);
  if (!route) throw new ApiError(404, 'Page introuvable.');
  if (route.special) return account[route.special](route.args);
  return callRpc(route.fn, route.args);
}

export const api = {
  get: (url) => request('GET', url),
  post: (url, body = {}) => request('POST', url, body),
  put: (url, body = {}) => request('PUT', url, body),
};
