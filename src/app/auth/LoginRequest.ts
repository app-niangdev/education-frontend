/**
 * Les identifiants envoyés à `POST /auth/login`.
 *
 * Le serveur accepte trois entrées possibles — e-mail, nom d'utilisateur ou
 * téléphone — et en attend exactement une. Elles sont donc toutes facultatives
 * ici : c'est l'écran de connexion qui choisit laquelle remplir, selon la
 * forme de ce qui a été saisi (voir `LoginComponent.identifiants`).
 *
 * Le téléphone est l'identifiant des familles : beaucoup de tuteurs n'ont pas
 * d'adresse e-mail. Il part tel qu'il a été saisi, espaces et indicatif
 * compris ; le serveur le normalise avant de le comparer.
 */
export interface LoginRequest {
  email?: string;
  username?: string;
  phone?: string;
  password: string;
  rememberMe?: boolean;
}
