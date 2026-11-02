// Opérations de compte : session, connexion (email ou identifiant), inscription.
import { ApiError, MIN_PASSWORD, NETWORK, getClient, callRpc, signOut, isNetworkError } from './core.js';
import { passwordOps } from './passwords.js';

const USERNAME_RE = /^[A-Za-z0-9._-]{3,30}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Adresse de l'application (sans ?query ni #), utilisée dans les liens des emails
const appUrl = () => location.origin + location.pathname;

async function currentUser() {
  const { data } = await getClient().auth.getSession();
  if (!data.session) return null;
  try {
    return (await callRpc('me', {}, true)).user;
  } catch (e) {
    if (e.status === 0) throw e;
    return null;
  }
}

async function me() {
  const user = await currentUser();
  // session présente mais compte désactivé ou supprimé : on la ferme
  if (!user && (await getClient().auth.getSession()).data.session) await signOut();
  return { user };
}

async function login({ login: id, password }) {
  id = String(id ?? '').trim();
  if (!id || !password) throw new ApiError(400, 'Veuillez remplir tous les champs.');
  const data = await passwordOps.callAccountFunction({ action: 'login', login: id, password });
  if (!data.session) throw new ApiError(500, 'Connexion impossible. Réessayez.');
  const { error } = await getClient().auth.setSession({
    access_token: data.session.access_token, refresh_token: data.session.refresh_token,
  });
  if (error) throw new ApiError(500, 'Connexion impossible. Réessayez.');
  return { user: await currentUser() };
}

async function register({ username, email, password }) {
  username = String(username ?? '').trim();
  email = String(email ?? '').trim().toLowerCase();
  password = String(password ?? '');
  if (!USERNAME_RE.test(username)) {
    throw new ApiError(400, "L'identifiant doit faire 3 à 30 caractères : lettres, chiffres, point, tiret ou underscore.");
  }
  if (!EMAIL_RE.test(email)) throw new ApiError(400, "Cette adresse email n'est pas valide.");
  if (password.length < MIN_PASSWORD) throw new ApiError(400, `Ce mot de passe est trop court (${MIN_PASSWORD} caractères minimum).`);

  if ((await callRpc('username_available', { p_username: username }, true)) === false) {
    throw new ApiError(409, 'Cet identifiant est déjà pris. Choisissez-en un autre.');
  }
  const { data, error } = await getClient().auth.signUp({
    email, password, options: { data: { username }, emailRedirectTo: appUrl() },
  });
  if (error) {
    if (isNetworkError(error)) throw new ApiError(0, NETWORK);
    if (error.status === 429) throw new ApiError(429, 'Trop de tentatives. Réessayez dans quelques minutes.');
    if (/already registered|already been registered/i.test(error.message)) throw new ApiError(409, 'Un compte existe déjà avec cette adresse email.');
    if (/database error/i.test(error.message)) throw new ApiError(409, 'Cet identifiant est déjà pris. Choisissez-en un autre.');
    if (/password/i.test(error.message)) throw new ApiError(400, 'Ce mot de passe est refusé. Choisissez-en un autre.');
    throw new ApiError(error.status || 500, 'Inscription impossible pour le moment. Réessayez plus tard.');
  }
  if (!data.session) {
    // la confirmation de l'adresse est activée dans Supabase : pas encore de session
    throw new ApiError(202, 'Compte créé. Un email de confirmation vient de vous être envoyé : cliquez sur le lien, puis connectez-vous.');
  }
  return { user: await currentUser() };
}

async function logout() {
  await signOut();
  return { ok: true };
}

export const account = { me, login, register, logout, ...passwordOps.handlers };
