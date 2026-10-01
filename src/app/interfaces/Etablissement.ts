export interface Etablissement {
  id: number;
  logo: string;
  nom: string;
  nom_court: string;
  slogan: string;
  adresse: string;
  email: string;
  telephone_principal: string;
  telephone_secondaire: string;
  site_web: string;
  lien_facebook: string;
  lien_instagram: string;
  inspection_academique: string;
  inspection_education_formation: string;
  /** Couleur primaire de la plateforme (exposée publiquement pour la page d'accueil). */
  code_couleur?: string;
  /** Mode maintenance : rend la plateforme inaccessible sauf aux admins. */
  en_maintenance?: boolean;
}
