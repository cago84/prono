// Noyau de l'accès à Supabase : client, erreurs en français, appel des fonctions SQL (RPC).
import { config } from './config.js';

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const MIN_PASSWORD = 8;
export const NETWORK = 'Connexion impossible. Vérifiez votre réseau et réessayez.';

let onUnauthorized = () => {};
export function setUnauthorizedHandler(fn) { onUnauthorized = fn; }

let client = null;
let manualSignOut = false;

export function getClient() {
  if (client) return client;
  if (!window.supabase || !config.supabaseUrl || config.supabaseUrl.includes('VOTRE-PROJET')) {
    throw new ApiError(0, "L'application n'est pas encore configurée (web/js/config.js : adresse et clé du projet Supabase).");
  }
  client = window.supabase.createClient(config.supabaseUrl, config.supabaseKey, {
    // le fragment (#) de l'adresse sert au routeur de l'application, pas à Supabase
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
  // Session perdue (jeton non renouvelable, déconnexion depuis un autre onglet...)
  client.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT' && !manualSignOut) setTimeout(() => onUnauthorized(), 0);
  });
  return client;
}

// Exécute fn sans que la déconnexion qu'elle provoque soit prise pour une session expirée
export async function quietly(fn) {
  manualSignOut = true;
  try { return await fn(); }
  catch { /* ignoré : la session locale est de toute façon effacée */ }
  finally { setTimeout(() => { manualSignOut = false; }, 100); }
}

export const signOut = (scope = 'local') => quietly(() => getClient().auth.signOut({ scope }));

export const isNetworkError = (e) =>
  !e || e.status === 0 || /failed to fetch|networkerror|load failed/i.test(String(e.message || ''));

// Seuls les messages écrits par nos fonctions SQL (P0001, PT4xx) sont montrés tels quels
export function toApiError(error, status) {
  const code = String(error.code || '');
  if (code === 'P0001' || /^PT\d{3}$/.test(code)) {
    return new ApiError(/^PT\d{3}$/.test(code) ? Number(code.slice(2)) : 400, error.message);
  }
  if (isNetworkError(error)) return new ApiError(0, NETWORK);
  if (status === 401) return new ApiError(401, 'Veuillez vous connecter.');
  return new ApiError(status || 500,
    'Une erreur est survenue. Si elle persiste, vérifiez que les migrations SQL ont bien été appliquées.');
}

// quiet = true : n'annonce pas « session expirée » (utilisé au démarrage)
export async function callRpc(fn, args, quiet = false) {
  const { data, error, status } = await getClient().rpc(fn, args);
  if (error) {
    const err = toApiError(error, status);
    if (err.status === 401 && !quiet) onUnauthorized();
    throw err;
  }
  return data;
}
