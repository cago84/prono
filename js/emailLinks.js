// Liens reçus par email : ?token_hash=...&type=recovery|signup
import { getClient } from './core.js';

// Lit puis efface le lien de la barre d'adresse. Retourne { type, token } ou null.
export function takeEmailLink() {
  const p = new URLSearchParams(location.search);
  const token = p.get('token_hash');
  const type = p.get('type');
  if (!token || !type) return null;
  history.replaceState(null, '', location.pathname + location.hash);
  return { type, token };
}

// Confirmation d'adresse (inscription) : ouvre la session. Retourne true si elle a réussi.
export async function confirmSignup(token) {
  const { error } = await getClient().auth.verifyOtp({ token_hash: token, type: 'signup' });
  return !error;
}
