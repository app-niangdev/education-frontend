/**
 * Lecture du tableur de reprise de donnees.
 *
 * Le fichier est lu ici, dans le navigateur, et non envoye brut au serveur :
 * l'agent voit ses erreurs de saisie ligne par ligne et corrige AVANT que
 * quoi que ce soit ne parte en base. Un aller-retour serveur pour decouvrir
 * qu'une date est mal ecrite ferait perdre le fichier entier.
 *
 * Ce module ne connait ni Angular ni le reseau : il transforme un classeur en
 * lignes valides d'un cote, en erreurs de l'autre. C'est ce qui le rend
 * testable seul.
 */

import * as XLSX from 'xlsx';

import {
  AptitudeSportive,
  ElevePayload,
  GroupeSanguin,
  GROUPES_SANGUINS,
  Sexe,
  StatutInscriptionEleve
} from 'src/app/interfaces/Eleve';
import { LienParente, TuteurPayload } from 'src/app/interfaces/Tuteur';

/** Une ligne prete a partir, telle que l'attend POST /eleves/import. */
export interface LigneImport {
  /** Numero de la ligne dans le tableur, en-tete comprise. */
  ligne: number;
  eleve: ElevePayload;
  tuteur?: Partial<TuteurPayload>;
}

/** Une ligne que le fichier ne permet pas d'importer. */
export interface ErreurImport {
  ligne: number;
  /** Ce que la ligne designe, pour que l'agent la retrouve dans Excel. */
  intitule: string;
  messages: string[];
}

export interface ResultatLecture {
  lignes: LigneImport[];
  erreurs: ErreurImport[];
  /** Colonnes du fichier qu'aucun champ connu ne reconnait. */
  colonnesIgnorees: string[];
}

/**
 * Correspondance entre les en-tetes du tableur et les champs de la fiche.
 *
 * Plusieurs libelles pointent vers le meme champ : les fichiers viennent de
 * secretariats differents, personne n'ecrit « date de naissance » de la meme
 * facon.
 *
 * Les cles sont comparees apres normalisation (voir normaliserEntete) : sans
 * accents, en minuscules, et toute ponctuation reduite a une espace. Elles
 * doivent donc etre ecrites ICI sous cette forme normalisee — c'est pourquoi
 * l'apostrophe apparait comme une espace : « Prénom de l'élève » devient
 * « prenom de l eleve », et non « prenom de leleve ».
 */
const COLONNES: Record<string, string> = {
  // --- Identite ---------------------------------------------------------
  matricule: 'matricule',
  'matricule eleve': 'matricule',
  'n matricule': 'matricule',
  nom: 'nom',
  'nom eleve': 'nom',
  'nom de l eleve': 'nom',
  prenom: 'prenom',
  prenoms: 'prenom',
  'prenom eleve': 'prenom',
  'prenom de l eleve': 'prenom',
  'date de naissance': 'date_naissance',
  'date naissance': 'date_naissance',
  'ne le': 'date_naissance',
  'lieu de naissance': 'lieu_naissance',
  'lieu naissance': 'lieu_naissance',
  sexe: 'sexe',
  genre: 'sexe',
  nationalite: 'nationalite',
  adresse: 'adresse',
  'adresse eleve': 'adresse',
  domicile: 'adresse',
  telephone: 'telephone',
  'telephone eleve': 'telephone',
  tel: 'telephone',

  // --- Antecedents medicaux ---------------------------------------------
  'groupe sanguin': 'groupe_sanguin',
  allergies: 'allergies',
  allergie: 'allergies',
  'maladies chroniques': 'maladies_chroniques',
  'maladie chronique': 'maladies_chroniques',
  'aptitude sportive': 'aptitude_sportive',
  'consignes d urgence': 'consignes_urgence',
  'consigne d urgence': 'consignes_urgence',

  // --- Scolarite --------------------------------------------------------
  statut: 'statut_inscription',
  'statut inscription': 'statut_inscription',
  'statut de l eleve': 'statut_inscription',
  'etablissement d origine': 'etablissement_origine',
  'ecole d origine': 'etablissement_origine',
  'date d inscription': 'date_inscription',
  'date inscription': 'date_inscription',

  // --- Pere -------------------------------------------------------------
  'nom du pere': 'nom_pere',
  'nom pere': 'nom_pere',
  'prenom du pere': 'prenom_pere',
  'prenom pere': 'prenom_pere',
  'telephone du pere': 'telephone_pere',
  'telephone pere': 'telephone_pere',
  'tel pere': 'telephone_pere',
  'profession du pere': 'profession_pere',
  'profession pere': 'profession_pere',
  'adresse du pere': 'adresse_pere',
  'adresse pere': 'adresse_pere',

  // --- Mere -------------------------------------------------------------
  'nom de la mere': 'nom_mere',
  'nom mere': 'nom_mere',
  'prenom de la mere': 'prenom_mere',
  'prenom mere': 'prenom_mere',
  'telephone de la mere': 'telephone_mere',
  'telephone mere': 'telephone_mere',
  'tel mere': 'telephone_mere',
  'profession de la mere': 'profession_mere',
  'profession mere': 'profession_mere',
  'adresse de la mere': 'adresse_mere',
  'adresse mere': 'adresse_mere',

  // --- Tuteur legal -----------------------------------------------------
  'lien de parente': 'tuteur.lien_parente',
  'lien parente': 'tuteur.lien_parente',
  'tuteur lien': 'tuteur.lien_parente',
  'nom du tuteur': 'tuteur.nom',
  'nom tuteur': 'tuteur.nom',
  'prenom du tuteur': 'tuteur.prenom',
  'prenom tuteur': 'tuteur.prenom',
  'telephone du tuteur': 'tuteur.telephone_principal',
  'telephone tuteur': 'tuteur.telephone_principal',
  'tel tuteur': 'tuteur.telephone_principal',
  'telephone secondaire': 'tuteur.telephone_secondaire',
  'telephone secondaire tuteur': 'tuteur.telephone_secondaire',
  'email tuteur': 'tuteur.email',
  'email du tuteur': 'tuteur.email',
  email: 'tuteur.email',
  'profession du tuteur': 'tuteur.profession',
  'profession tuteur': 'tuteur.profession',
  'adresse du tuteur': 'tuteur.adresse',
  'adresse tuteur': 'tuteur.adresse',
  nin: 'tuteur.nin',
  'nin tuteur': 'tuteur.nin',
  'nin du tuteur': 'tuteur.nin'
};

/** Les champs sans lesquels une fiche eleve ne vaut rien. */
const CHAMPS_REQUIS = ['nom', 'prenom', 'date_naissance', 'sexe'] as const;

/**
 * Ecritures acceptees pour le sexe. Le tableur porte tantot l'initiale,
 * tantot le mot entier, tantot le libelle en anglais d'un export precedent.
 */
const SEXES: Record<string, Sexe> = {
  m: 'M',
  f: 'F',
  h: 'M',
  homme: 'M',
  femme: 'F',
  masculin: 'M',
  feminin: 'F',
  garcon: 'M',
  fille: 'F',
  male: 'M',
  female: 'F'
};

const STATUTS: Record<string, StatutInscriptionEleve> = {
  nouveau: 'NOUVEAU',
  nouvelle: 'NOUVEAU',
  redoublant: 'REDOUBLANT',
  redoublante: 'REDOUBLANT',
  reinscrit: 'REINSCRIT',
  reinscrite: 'REINSCRIT',
  reinscription: 'REINSCRIT',
  ancien: 'REINSCRIT',
  transfere: 'TRANSFERE',
  transferee: 'TRANSFERE',
  transfert: 'TRANSFERE'
};

const APTITUDES: Record<string, AptitudeSportive> = {
  apte: 'APTE',
  'apte partiellement': 'APTE_PARTIEL',
  'apte partiel': 'APTE_PARTIEL',
  partiel: 'APTE_PARTIEL',
  inapte: 'INAPTE',
  'non apte': 'INAPTE'
};

const LIENS: Record<string, LienParente> = {
  pere: 'PERE',
  papa: 'PERE',
  mere: 'MERE',
  maman: 'MERE',
  oncle: 'ONCLE',
  tante: 'TANTE',
  'grand parent': 'GRAND_PARENT',
  grandparent: 'GRAND_PARENT',
  'grand pere': 'GRAND_PARENT',
  'grand mere': 'GRAND_PARENT',
  autre: 'AUTRE',
  tuteur: 'AUTRE'
};

/**
 * Met un en-tete de colonne sous la forme comparable aux cles de COLONNES :
 * sans accents, en minuscules, toute suite de caracteres non alphanumeriques
 * ramenee a une seule espace.
 *
 * L'apostrophe compte donc comme un separateur, pas comme un caractere a
 * supprimer : « Prénom de l'élève » donne « prenom de l eleve ».
 */
function normaliserEntete(valeur: string): string {
  return valeur
    .normalize('NFD')
    // Les diacritiques decomposes par NFD (U+0300 a U+036F). Notes en
    // echappement plutot qu'en caracteres bruts : des marques combinantes
    // dans le source sont invisibles a la lecture et survivent mal aux
    // copier-coller entre editeurs.
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Meme normalisation, pour comparer une VALEUR a une table de synonymes. */
function normaliserValeur(valeur: unknown): string {
  return typeof valeur === 'string' || typeof valeur === 'number'
    ? normaliserEntete(String(valeur))
    : '';
}

function texteOuNull(valeur: unknown): string | null {
  if (valeur === null || valeur === undefined) return null;

  const texte = String(valeur).trim();
  return texte.length > 0 ? texte : null;
}

/**
 * Convertit une cellule de date en `YYYY-MM-DD`.
 *
 * Excel stocke une date comme un nombre de jours depuis 1900 ; SheetJS le
 * rend tel quel si la cellule n'est pas formatee en date. Les deux formes
 * sont donc acceptees, ainsi que les ecritures textuelles courantes.
 *
 * Le format jour/mois/annee est privilegie sur mois/jour/annee : les
 * registres sont tenus en francais. « 03/04/2015 » est donc le 3 avril.
 */
export function lireDate(valeur: unknown): string | null {
  if (valeur === null || valeur === undefined || valeur === '') return null;

  // Numero de serie Excel : c'est la forme sous laquelle arrivent les vraies
  // cellules de date (voir lireClasseur, qui n'active pas cellDates).
  //
  // Le serie est arrondi au jour entier avant d'etre decode. Une date pure
  // devrait tomber sur un entier, mais les fichiers produits par un export
  // logiciel portent frequemment une fraction residuelle — « 41156,9999 »
  // pour le 5 septembre 2012, soit 23:59:52 la veille. Tronquer, comme le
  // fait parse_date_code seul, reculerait alors la date d'un jour, en
  // silence et sur toute une reprise de donnees.
  //
  // parse_date_code garde en revanche la main sur la conversion elle-meme :
  // il traite l'anomalie du 29/02/1900 que le tableur perpetue.
  if (typeof valeur === 'number') {
    const parsee = XLSX.SSF.parse_date_code(Math.round(valeur));

    if (!parsee || !parsee.y) return null;

    return `${parsee.y}-${`${parsee.m}`.padStart(2, '0')}-${`${parsee.d}`.padStart(2, '0')}`;
  }

  // Filet de securite : un objet Date peut encore venir d'un CSV, ou d'une
  // lecture faite ailleurs avec cellDates.
  //
  // Il est arrondi au jour le plus proche AVANT d'etre lu. SheetJS rend en
  // effet les dates a « 23:59:59.999 » du jour precedent — un artefact
  // d'arrondi de la conversion serie -> date. Lire les composantes telles
  // quelles reculerait chaque date de naissance d'un jour, en silence.
  if (valeur instanceof Date) {
    if (Number.isNaN(valeur.getTime())) return null;

    // L'arrondi porte sur un instant UTC : les composantes se relisent donc
    // en UTC. Passer par les getters locaux redecalerait la date a l'ouest
    // de Greenwich, ce que l'arrondi vient precisement de corriger.
    const jour = new Date(Math.round(valeur.getTime() / 86400000) * 86400000);

    const mois = `${jour.getUTCMonth() + 1}`.padStart(2, '0');
    const quantieme = `${jour.getUTCDate()}`.padStart(2, '0');

    return `${jour.getUTCFullYear()}-${mois}-${quantieme}`;
  }

  const texte = String(valeur).trim();
  if (texte === '') return null;

  // Deja au format ISO.
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(texte);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  // jour/mois/annee, avec / . ou - comme separateur.
  const fr = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/.exec(texte);
  if (fr) {
    const jour = Number(fr[1]);
    const mois = Number(fr[2]);
    let annee = Number(fr[3]);

    // Une annee sur deux chiffres : au-dela de l'annee courante, c'est le
    // siecle precedent — un eleve ne nait pas dans le futur.
    if (annee < 100) {
      const pivot = new Date().getFullYear() % 100;
      annee += annee <= pivot ? 2000 : 1900;
    }

    if (mois < 1 || mois > 12 || jour < 1 || jour > 31) return null;

    const date = new Date(annee, mois - 1, jour);

    // Rejette les dates qui n'existent pas (31 fevrier : JS glisse au mois
    // suivant plutot que d'echouer).
    if (
      date.getFullYear() !== annee ||
      date.getMonth() !== mois - 1 ||
      date.getDate() !== jour
    ) {
      return null;
    }

    return formaterDate(date);
  }

  return null;
}

function formaterDate(date: Date): string {
  const mois = `${date.getMonth() + 1}`.padStart(2, '0');
  const jour = `${date.getDate()}`.padStart(2, '0');

  return `${date.getFullYear()}-${mois}-${jour}`;
}

/**
 * Le telephone est recopie tel quel, apostrophes et espaces retires : c'est
 * le backend qui le range sous sa forme canonique (Tuteur::normaliserTelephone),
 * et deux normalisations concurrentes finiraient par diverger.
 *
 * Excel ampute les zeros de tete des numeros saisis comme nombres : on les
 * restitue pour un numero senegalais a 8 chiffres, sans quoi « 077123456 »
 * arriverait mutile.
 */
function lireTelephone(valeur: unknown): string | null {
  if (valeur === null || valeur === undefined) return null;

  if (typeof valeur === 'number') {
    const chiffres = String(valeur);

    return chiffres.length === 8 ? `0${chiffres}` : chiffres;
  }

  return texteOuNull(String(valeur).replace(/[\s.]/g, ''));
}

/**
 * Lit le classeur et repartit ses lignes entre importables et refusees.
 *
 * `defval: null` garde les cellules vides dans l'objet : sans lui, SheetJS les
 * omet et une colonne effacee deviendrait indistinguable d'une colonne absente.
 * `raw: true` laisse les nombres en nombres plutot qu'en texte deja mis en
 * forme par le tableur — lireDate() et lireTelephone() en tirent davantage.
 *
 * `cellDates` n'est deliberement PAS active : une cellule de date arrive
 * alors sous sa forme d'origine, le numero de serie Excel, que
 * SSF.parse_date_code decode exactement. Reconstitue en objet Date, le meme
 * jour revient a « 23:59:59.999 » de la veille — un artefact d'arrondi qui
 * reculerait chaque date de naissance d'un jour sans que rien ne le signale.
 */
export function lireClasseur(donnees: ArrayBuffer): ResultatLecture {
  const classeur = XLSX.read(donnees, { type: 'array' });
  const feuille = classeur.Sheets[classeur.SheetNames[0]];

  if (!feuille) {
    return { lignes: [], erreurs: [], colonnesIgnorees: [] };
  }

  const rangees = XLSX.utils.sheet_to_json<Record<string, unknown>>(feuille, {
    defval: null,
    raw: true
  });

  const lignes: LigneImport[] = [];
  const erreurs: ErreurImport[] = [];
  const colonnesIgnorees = new Set<string>();

  rangees.forEach((rangee, index) => {
    // L'en-tete occupe la premiere ligne : la premiere donnee est la 2e.
    const numeroLigne = index + 2;

    // Une ligne entierement vide est un residu de mise en forme, pas une
    // erreur de saisie : on la passe sans rien dire.
    if (Object.values(rangee).every((v) => v === null || String(v).trim() === '')) {
      return;
    }

    const { eleve, tuteur, messages } = lireRangee(rangee, colonnesIgnorees);

    if (messages.length > 0) {
      erreurs.push({
        ligne: numeroLigne,
        intitule: intituleLigne(eleve, rangee),
        messages
      });

      return;
    }

    lignes.push({
      ligne: numeroLigne,
      eleve,
      // Un bloc tuteur vide n'est pas envoye : le backend le traite comme
      // absent, l'eleve est alors cree sans responsable rattache.
      ...(tuteur ? { tuteur } : {})
    });
  });

  return { lignes, erreurs, colonnesIgnorees: [...colonnesIgnorees] };
}

/** Ce qui identifie la ligne dans le rapport, meme quand elle est invalide. */
function intituleLigne(eleve: ElevePayload, rangee: Record<string, unknown>): string {
  const nom = [eleve.prenom, eleve.nom].filter(Boolean).join(' ').trim();

  if (nom) return nom;

  // Ni nom ni prenom lisibles : on montre la premiere cellule remplie, pour
  // que l'agent reconnaisse quand meme sa ligne.
  const premiere = Object.values(rangee).find(
    (v) => v !== null && String(v).trim() !== ''
  );

  return premiere ? String(premiere).trim() : 'Ligne sans intitulé';
}

interface RangeeLue {
  eleve: ElevePayload;
  tuteur?: Partial<TuteurPayload>;
  messages: string[];
}

/**
 * Transforme une rangee du tableur en blocs eleve/tuteur.
 *
 * Les valeurs invalides ne sont pas silencieusement ecartees : chacune
 * produit un message qui nomme la colonne et ce qui etait attendu. Une
 * reprise de donnees se joue sur la confiance qu'on peut accorder au
 * resultat — une cellule mal lue et abandonnee sans bruit serait pire qu'un
 * refus.
 */
function lireRangee(
  rangee: Record<string, unknown>,
  colonnesIgnorees: Set<string>
): RangeeLue {
  const eleve: Record<string, unknown> = {};
  const tuteur: Record<string, unknown> = {};
  const messages: string[] = [];

  for (const [entete, brut] of Object.entries(rangee)) {
    // sheet_to_json nomme « __EMPTY » les colonnes sans en-tete : ce sont
    // des cellules hors tableau, pas des donnees.
    if (entete.startsWith('__EMPTY')) continue;

    const champ = COLONNES[normaliserEntete(entete)];

    if (!champ) {
      colonnesIgnorees.add(entete.trim());
      continue;
    }

    const estTuteur = champ.startsWith('tuteur.');
    const cle = estTuteur ? champ.slice('tuteur.'.length) : champ;
    const cible = estTuteur ? tuteur : eleve;

    const valeur = convertir(cle, brut, entete, messages);

    if (valeur !== undefined) cible[cle] = valeur;
  }

  for (const champ of CHAMPS_REQUIS) {
    if (eleve[champ] === null || eleve[champ] === undefined) {
      messages.push(`${LIBELLES_REQUIS[champ]} est obligatoire.`);
    }
  }

  // Le statut « transfere » sans etablissement d'origine laisserait une fiche
  // qui affirme un transfert sans dire d'ou : le backend l'exige a la saisie,
  // on l'exige ici aussi.
  if (eleve['statut_inscription'] === 'TRANSFERE' && !eleve['etablissement_origine']) {
    messages.push(
      "L'établissement d'origine est obligatoire pour un élève transféré."
    );
  }

  return {
    eleve: eleve as ElevePayload,
    tuteur: composerTuteur(tuteur, eleve, messages),
    messages
  };
}

const LIBELLES_REQUIS: Record<(typeof CHAMPS_REQUIS)[number], string> = {
  nom: 'Le nom',
  prenom: 'Le prénom',
  date_naissance: 'La date de naissance',
  sexe: 'Le sexe'
};

/**
 * Convertit une cellule selon le champ vise. Retourne `undefined` quand la
 * valeur est refusee — le message a alors deja ete pose.
 */
function convertir(
  cle: string,
  brut: unknown,
  entete: string,
  messages: string[]
): unknown {
  switch (cle) {
    case 'date_naissance':
    case 'date_inscription': {
      if (texteOuNull(brut) === null && !(brut instanceof Date)) return null;

      const date = lireDate(brut);

      if (date === null) {
        messages.push(
          `« ${entete.trim()} » : date illisible (${String(brut).trim()}). Format attendu : JJ/MM/AAAA.`
        );
        return undefined;
      }

      // Une date de naissance dans le futur est une inversion jour/annee ou
      // une faute de frappe : la refuser ici evite un aller-retour serveur.
      if (cle === 'date_naissance' && date >= formaterDate(new Date())) {
        messages.push(
          `« ${entete.trim()} » : la date de naissance doit être antérieure à aujourd'hui.`
        );
        return undefined;
      }

      return date;
    }

    case 'sexe':
      return traduire(brut, SEXES, entete, messages, 'M ou F');

    case 'statut_inscription':
      return traduire(
        brut,
        STATUTS,
        entete,
        messages,
        'Nouveau, Redoublant, Réinscrit ou Transféré'
      );

    case 'aptitude_sportive':
      return traduire(
        brut,
        APTITUDES,
        entete,
        messages,
        'Apte, Apte partiellement ou Inapte'
      );

    case 'lien_parente':
      return traduire(
        brut,
        LIENS,
        entete,
        messages,
        'Père, Mère, Oncle, Tante, Grand-parent ou Autre'
      );

    case 'groupe_sanguin': {
      const texte = texteOuNull(brut);
      if (texte === null) return null;

      // Le groupe sanguin ne se normalise pas comme le reste : le « + » et
      // le « - » sont porteurs de sens et normaliserEntete() les effacerait.
      const groupe = texte.toUpperCase().replace(/\s/g, '') as GroupeSanguin;

      if (!GROUPES_SANGUINS.includes(groupe)) {
        messages.push(
          `« ${entete.trim()} » : groupe sanguin inconnu (${texte}). Valeurs admises : ${GROUPES_SANGUINS.join(', ')}.`
        );
        return undefined;
      }

      return groupe;
    }

    case 'telephone':
    case 'telephone_pere':
    case 'telephone_mere':
    case 'telephone_principal':
    case 'telephone_secondaire':
      return lireTelephone(brut);

    default:
      return texteOuNull(brut);
  }
}

/** Cherche la valeur dans une table de synonymes, ou pose un message. */
function traduire<T>(
  brut: unknown,
  table: Record<string, T>,
  entete: string,
  messages: string[],
  attendu: string
): T | null | undefined {
  const texte = texteOuNull(brut);
  if (texte === null) return null;

  const valeur = table[normaliserValeur(texte)];

  if (valeur === undefined) {
    messages.push(
      `« ${entete.trim()} » : valeur non reconnue (${texte}). Attendu : ${attendu}.`
    );
    return undefined;
  }

  return valeur;
}

/**
 * Compose le bloc tuteur a envoyer, ou `undefined` s'il n'y a rien a envoyer.
 *
 * Quand le lien designe le pere ou la mere, les coordonnees ne sont pas
 * recopiees ici : le backend les deduit du bloc parent
 * (EleveService::completerDepuisParent). Les dupliquer cote navigateur
 * ouvrirait deux sources pour la meme information.
 *
 * A l'inverse, un tuteur tiers n'existe que par ce bloc : sans nom ni
 * telephone, la fiche serait inexploitable — ni recouvrement, ni messagerie.
 * On le refuse plutot que de creer un responsable vide.
 */
function composerTuteur(
  tuteur: Record<string, unknown>,
  eleve: Record<string, unknown>,
  messages: string[]
): Partial<TuteurPayload> | undefined {
  const renseigne = Object.values(tuteur).some(
    (v) => v !== null && v !== undefined && v !== ''
  );

  if (!renseigne) return undefined;

  const lien = tuteur['lien_parente'] as LienParente | null | undefined;

  if (!lien) {
    messages.push(
      'Le lien de parenté du tuteur est obligatoire dès que la colonne tuteur est renseignée.'
    );
    return undefined;
  }

  if (lien === 'PERE' || lien === 'MERE') {
    const prefixe = lien === 'PERE' ? 'pere' : 'mere';

    // Le bloc parent fait foi : il doit au moins porter de quoi joindre le
    // responsable, faute de quoi la fiche tuteur naitrait sans coordonnees.
    if (!eleve[`nom_${prefixe}`] || !eleve[`telephone_${prefixe}`]) {
      const parent = lien === 'PERE' ? 'du père' : 'de la mère';

      messages.push(
        `Le nom et le téléphone ${parent} sont obligatoires : ${lien === 'PERE' ? 'il est désigné comme tuteur légal' : 'elle est désignée comme tutrice légale'}.`
      );
      return undefined;
    }
  } else if (!tuteur['nom'] || !tuteur['prenom'] || !tuteur['telephone_principal']) {
    messages.push(
      "Le nom, le prénom et le téléphone du tuteur sont obligatoires lorsqu'il n'est ni le père ni la mère."
    );
    return undefined;
  }

  return tuteur as Partial<TuteurPayload>;
}

/**
 * En-tetes du modele vierge propose au telechargement.
 *
 * L'ordre suit celui de la fiche eleve a l'ecran : identite, medical,
 * scolarite, parents, tuteur. Un agent qui connait le formulaire retrouve ses
 * reperes dans le tableur.
 */
export const ENTETES_MODELE: string[] = [
  'Matricule',
  'Nom',
  'Prénom',
  'Date de naissance',
  'Lieu de naissance',
  'Sexe',
  'Nationalité',
  'Adresse',
  'Téléphone',
  'Groupe sanguin',
  'Allergies',
  'Maladies chroniques',
  'Aptitude sportive',
  "Consignes d'urgence",
  'Statut',
  "Établissement d'origine",
  "Date d'inscription",
  'Nom du père',
  'Prénom du père',
  'Téléphone du père',
  'Profession du père',
  'Adresse du père',
  'Nom de la mère',
  'Prénom de la mère',
  'Téléphone de la mère',
  'Profession de la mère',
  'Adresse de la mère',
  'Lien de parenté',
  'Nom du tuteur',
  'Prénom du tuteur',
  'Téléphone du tuteur',
  'Téléphone secondaire',
  'Email tuteur',
  'Profession du tuteur',
  'Adresse du tuteur',
  'NIN'
];

/**
 * Deux lignes d'exemple dans le modele : elles montrent les formats attendus
 * mieux qu'une notice — notamment que le tuteur pere ne redemande pas ses
 * coordonnees, deja portees par le bloc parent.
 *
 * La seconde porte un NIN, et ce n'est pas un detail d'illustration : c'est
 * la seule clef sur laquelle le serveur reconnait un tuteur deja enregistre
 * (EleveService::resoudreTuteur). Une fratrie importee sans NIN recoit autant
 * de fiches tuteur que d'enfants — donc autant d'acces famille distincts.
 */
const EXEMPLES: string[][] = [
  [
    '',
    'DIOP',
    'Awa',
    '12/03/2014',
    'Dakar',
    'F',
    'Sénégalaise',
    'Bargny',
    '',
    'O+',
    '',
    '',
    'Apte',
    '',
    'Nouveau',
    '',
    '',
    'DIOP',
    'Moussa',
    '771234567',
    'Commerçant',
    'Bargny',
    'FALL',
    'Fatou',
    '761234567',
    'Couturière',
    'Bargny',
    'Père',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    ''
  ],
  [
    'ELV-2024-018',
    'NDIAYE',
    'Ibrahima',
    '05/09/2012',
    'Rufisque',
    'M',
    'Sénégalaise',
    'Bargny',
    '',
    '',
    '',
    '',
    'Apte',
    '',
    'Transféré',
    'École Serigne Fallou',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'Oncle',
    'NDIAYE',
    'Cheikh',
    '781234567',
    '',
    '',
    'Enseignant',
    'Rufisque',
    '1234567890123'
  ]
];

/**
 * Genere le modele vierge. Les colonnes recoivent une largeur : sans elle,
 * « Consignes d'urgence » s'affiche tronque et l'agent ne sait pas ce qu'on
 * lui demande.
 */
export function genererModele(): void {
  const feuille = XLSX.utils.aoa_to_sheet([ENTETES_MODELE, ...EXEMPLES]);

  feuille['!cols'] = ENTETES_MODELE.map((entete) => ({
    wch: Math.max(14, entete.length + 2)
  }));

  const classeur = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(classeur, feuille, 'Élèves');

  XLSX.writeFile(classeur, 'modele-import-eleves.xlsx');
}
