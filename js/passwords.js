// Mots de passe : changement, « mot de passe oublié » et réinitialisation par lien email.
import { config } from './config.js';
import { ApiError, MIN_PASSWORD, NETWORK, getClient, signOut, quietly, isNetworkError } from './core.js';

const INVALID_LINK = "Ce lien n'est plus valide ou a expiré. Faites une nouvelle demande.";

// Appelle l'Edge Function « account » (connexion par identifiant, mot de passe oublié)
async function callAccountFunction(payload) {
  let res;
  try {
    res = await fetch(`${config.supabaseUrl}/functions/v1/account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: config.supabaseKey },
      body: JSON.stringify(payload),
    });
  } catch { throw new ApiError(0, NETWORK); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || 'Une erreur est survenue.');
  return data;
}

async function password({ current, password: next }) {
  const sb = getClient();
  const { data } = await sb.auth.getSession();
  const email = data.session && data.session.user.email;
  if (!email) throw new ApiError(401, 'Veuillez vous connecter.');
  if (String(next ?? '').length < MIN_PASSWORD) {
    throw new ApiError(400, `Le nouveau mot de passe est trop court (${MIN_PASSWORD} caractères minimum).`);
  }
  // on vérifie le mot de passe actuel avant de changer
  const check = await sb.auth.signInWithPassword({ email, password: String(current ?? '') });
  if (check.error) {
    if (isNetworkError(check.error)) throw new ApiError(0, NETWORK);
    throw new ApiError(400, 'Le mot de passe actuel est incorrect.');
  }
  const { error } = await sb.auth.updateUser({ password: next });
  if (error) throw new ApiError(error.status || 400, 'Ce mot de passe est refusé. Choisissez-en un autre.');
  // cette session reste connectée, les autres sont fermées
  await quietly(() => sb.auth.signOut({ scope: 'others' }));
  return { ok: true };
}

async function forgot({ login }) {
  const id = String(login ?? '').trim();
  if (!id) throw new ApiError(400, 'Indiquez votre adresse email ou votre identifiant.');
  await callAccountFunction({ action: 'forgot', login: id });
  return { ok: true };
}

// Le jeton n'est consommé qu'à la validation du formulaire (pas à l'ouverture de la page) :
// un antivirus qui « visite » le lien de l'email ne le détruit donc pas.
async function resetCheck() {
  return { valid: true };
}

async function reset({ token, password: next }) {
  if (String(next ?? '').length < MIN_PASSWORD) {
    throw new ApiError(400, `Ce mot de passe est trop court (${MIN_PASSWORD} caractères minimum).`);
  }
  const sb = getClient();
  const { error } = await sb.auth.verifyOtp({ token_hash: token, type: 'recovery' });
  if (error) {
    if (isNetworkError(error)) throw new ApiError(0, NETWORK);
    throw new ApiError(400, INVALID_LINK);
  }
  const upd = await sb.auth.updateUser({ password: next });
  if (upd.error) {
    await signOut();
    throw new ApiError(400, 'Ce mot de passe est refusé. Choisissez-en un autre, puis refaites une demande de lien.');
  }
  await signOut('global'); // tous les appareils doivent se reconnecter avec le nouveau mot de passe
  return { ok: true };
}

export const passwordOps = {
  callAccountFunction,
  handlers: { password, forgot, resetCheck, reset },
};
