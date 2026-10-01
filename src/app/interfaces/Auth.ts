import { Menu } from './Menu';

export interface LoginRequest {
  email?: string;
  username?: string;
  phone?: string;
  password: string;
}

/** Les jetons et ce dont l'application a besoin au démarrage. */
export interface SessionData {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
  must_change_password?: boolean;
  menus: Menu[];
}

/**
 * Ce que le serveur renvoie quand la connexion doit être confirmée par un code.
 *
 * Aucun jeton n'y figure : tant que le code n'est pas validé, il n'y a pas de
 * session, seulement une référence opaque vers la vérification en cours.
 */
export interface OtpChallengeData {
  challenge_token: string;
  reason: 'TWO_FACTOR' | 'IP_PREVIOUSLY_BLOCKED';
  expires_in: number;
  masked_email: string | null;
}

/**
 * Réponse de /auth/login. Les deux issues possibles se distinguent par `code`,
 * jamais par la présence d'un champ : c'est lui qui fait foi.
 */
export type LoginApiResponse =
  | { success: true; code: 'LOGIN_SUCCESS'; data: SessionData }
  | {
      success: true;
      code: 'OTP_REQUIRED';
      message: string;
      data: OtpChallengeData;
    };

export interface VerifyOtpResponse {
  success: true;
  code: 'OTP_VERIFIED';
  message: string;
  data: SessionData;
}

/** Réponse des endpoints de mot de passe oublié. */
export interface PasswordResetResponse {
  success: true;
  code: 'RESET_LINK_SENT' | 'PASSWORD_RESET';
  message: string;
}

/** Réponse d'activation/désactivation du second facteur (format ApiResponse). */
export interface TwoFactorResponse {
  status: number;
  message: string;
  payload: { two_factor_enabled: boolean };
}

export interface ResendOtpResponse {
  success: true;
  code: 'OTP_SENT';
  message: string;
  expires_in: number;
}

/**
 * Corps d'un refus 429 pour cause d'IP bloquée. Émis par le middleware
 * serveur sur n'importe quelle route, pas seulement le login.
 */
export interface IpBlockedError {
  success: false;
  code: 'IP_BLOCKED';
  message: string;
  blocked_until: string;
  /** Secondes restantes au moment de la réponse. */
  retry_after: number;
}

/** Codes d'échec renvoyés par les endpoints d'authentification. */
export type AuthErrorCode =
  | 'IP_BLOCKED'
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_DISABLED'
  | 'INVALID_CHALLENGE'
  | 'INVALID_OTP'
  | 'OTP_EXPIRED'
  | 'OTP_TOO_MANY_ATTEMPTS'
  | 'OTP_RESEND_LIMIT'
  | 'OTP_RESEND_COOLDOWN';

export interface AuthErrorBody {
  success: false;
  code: AuthErrorCode;
  message: string;
  attempts_left?: number;
  retry_after?: number;
  blocked_until?: string;
}

export interface RefreshApiResponse {
  data: {
    access_token: string;
    refresh_token: string;
    token_type: 'Bearer';
    expires_in: number;
    message: string;
  };
}

export interface UserFromToken {
  id: number;
  email: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  role: string;
  menus: Menu[];
  image_url?: string | null;
  status?: boolean;
  address?: string | null;
  phone_number_one?: string | null;
  phone_number_two?: string | null;
  /** Second facteur exigé à chaque connexion, au choix de l'utilisateur. */
  two_factor_enabled?: boolean;

  // profil enseignant
  profil?: {
    matricule?: string | null;
    /** Matières de spécialité de l'enseignant (remplace l'ancien texte libre). */
    matieres?: { id: number; nom: string; code: string }[];
    type_contrat?: 'permanent' | 'vacataire' | 'stagiaire' | null;
    date_embauche?: string | null;
    salaire_base?: number | null;
    diplomes?: string | null;
    // surveillant
    zone_surveillance?: string | null;
    horaire?: string | null;
    // trésorier
    numero_compte_bancaire?: string | null;
    banque?: string | null;
    acces_caisse?: boolean | null;
  } | null;
}

/**
 * Ce qu'un utilisateur peut modifier sur son propre compte : son prénom, son
 * nom, ses coordonnées et sa photo. Son rôle et son statut n'y figurent pas —
 * ils relèvent de l'administration, et le serveur les refuserait.
 */
export interface UpdateProfilRequest {
  first_name: string;
  last_name: string;
  phone_number_one: string;
  phone_number_two?: string | null;
  address?: string | null;
  /** Nouvelle photo. Remplace la précédente. */
  photo?: File | null;
  /** Retire la photo actuelle sans en déposer de nouvelle. */
  supprimer_photo?: boolean;
}

export interface JwtPayload {
  iss: string;
  aud: string;
  iat: number;
  nbf: number;
  exp: number;
  sub: number;
  jti: string;
  user: UserFromToken;
  token_type: 'access' | 'refresh';
}

export interface MeApiResponse {
  status: number;
  message: string;
  payload: UserFromToken;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

export interface LogoutResponse {
  message: string;
}
