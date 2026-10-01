import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  inject,
  OnInit,
  ViewChild
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { fadeInRight400ms } from '@vex/animations/fade-in-right.animation';
import { scaleIn400ms } from '@vex/animations/scale-in.animation';
import { AuthService } from 'src/app/auth/services/auth.service';
import { EleveService } from 'src/app/auth/services/eleve.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import {
  APTITUDES_SPORTIVES,
  Eleve,
  EleveRequest,
  GROUPES_SANGUINS,
  NATIONALITE_PAR_DEFAUT,
  STATUTS_INSCRIPTION
} from 'src/app/interfaces/Eleve';
import {
  LIENS_PARENTE,
  TuteurRecherche,
  tuteurEstUnTiers
} from 'src/app/interfaces/Tuteur';
import { AnnuaireTuteurService } from 'src/app/auth/services/annuaire-tuteur.service';
import { cleanupValues, toApiDate, trimOrNull } from '../eleve-form.utils';
import {
  lireEleveIdDepuisState,
  peutSaisirInscription,
  ROUTE_ELEVE_DETAIL,
  ROUTE_ELEVES,
  ROUTE_INSCRIPTION_AJOUT,
  STATE_ELEVE_ID
} from '../eleve-navigation';

@Component({
  selector: 'vex-eleve-add-update',
  templateUrl: './eleve-add-update.component.html',
  styleUrls: ['./eleve-add-update.component.scss'],
  animations: [scaleIn400ms, fadeInRight400ms],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatRadioModule,
    MatDatepickerModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ]
})
export class EleveAddUpdateComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly eleveService = inject(EleveService);
  private readonly annuaireTuteur = inject(AnnuaireTuteurService);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);

  /**
   * Le stepper, pour avancer depuis le code plutot que via `matStepperNext` :
   * un formulaire invalide doit d'abord afficher ses erreurs (voir
   * `etapeSuivante`), ce que la directive ne fait pas d'elle-meme.
   */
  @ViewChild('stepper') private stepper?: MatStepper;

  /** L'hote du composant, pour atteindre les traits rendus par Material. */
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  readonly groupesSanguins = GROUPES_SANGUINS;
  readonly aptitudes = APTITUDES_SPORTIVES;
  readonly statuts = STATUTS_INSCRIPTION;
  readonly liensParente = LIENS_PARENTE;

  /** La date de naissance ne peut pas etre dans le futur. */
  readonly maxDate = new Date();

  /**
   * Le mode vient du segment d'URL (add vs edit), l'identifiant du state.
   * On lit la route plutot que router.url : pendant la navigation, cette
   * derniere pointe encore sur la page precedente.
   */
  private readonly modeEdition =
    this.route.snapshot.url.some((s) => s.path === 'edit');

  /**
   * Lu des le constructeur : getCurrentNavigation() n'est renseigne que
   * pendant la navigation et vaut deja null dans ngOnInit.
   */
  private readonly eleveId = lireEleveIdDepuisState(this.router);

  loading = false;
  chargement = false;
  /** Vrai pendant le patch initial : neutralise l'auto-remplissage du tuteur. */
  private chargementEnCours = false;

  eleve?: Eleve;

  identiteForm: FormGroup = this.fb.group({
    nom: ['', [Validators.required, Validators.maxLength(255)]],
    prenom: ['', [Validators.required, Validators.maxLength(255)]],
    date_naissance: [null as Date | null, [Validators.required]],
    lieu_naissance: ['', [Validators.maxLength(255)]],
    sexe: ['', [Validators.required]],
    nationalite: [NATIONALITE_PAR_DEFAUT, [Validators.maxLength(100)]],
    adresse: ['', [Validators.maxLength(255)]],
    telephone: ['', [Validators.maxLength(20)]],
    statut_inscription: ['NOUVEAU', [Validators.required]],
    etablissement_origine: ['', [Validators.maxLength(255)]]
  });

  medicalForm: FormGroup = this.fb.group({
    groupe_sanguin: [null as string | null],
    aptitude_sportive: ['APTE'],
    allergies: ['', [Validators.maxLength(2000)]],
    maladies_chroniques: ['', [Validators.maxLength(2000)]],
    consignes_urgence: ['', [Validators.maxLength(2000)]]
  });

  parentsForm: FormGroup = this.fb.group({
    nom_pere: ['', [Validators.maxLength(255)]],
    prenom_pere: ['', [Validators.maxLength(255)]],
    telephone_pere: ['', [Validators.maxLength(20)]],
    profession_pere: ['', [Validators.maxLength(255)]],
    adresse_pere: ['', [Validators.maxLength(255)]],

    nom_mere: ['', [Validators.maxLength(255)]],
    prenom_mere: ['', [Validators.maxLength(255)]],
    telephone_mere: ['', [Validators.maxLength(20)]],
    profession_mere: ['', [Validators.maxLength(255)]],
    adresse_mere: ['', [Validators.maxLength(255)]]
  });

  tuteurForm: FormGroup = this.fb.group({
    lien_parente: ['', [Validators.required]],
    nom: ['', [Validators.required, Validators.maxLength(255)]],
    prenom: ['', [Validators.required, Validators.maxLength(255)]],
    nin: ['', [Validators.maxLength(30)]],
    telephone_principal: ['', [Validators.required, Validators.maxLength(20)]],
    telephone_secondaire: ['', [Validators.maxLength(20)]],
    email: ['', [Validators.email, Validators.maxLength(255)]],
    profession: ['', [Validators.maxLength(255)]],
    adresse: ['', [Validators.required, Validators.maxLength(255)]]
  });

  /**
   * La recherche dans l'annuaire des tuteurs. Hors `tuteurForm` : ce n'est pas
   * une donnée de l'élève, seulement le moyen d'en retrouver une existante.
   */
  rechercheTuteur = this.fb.control('');

  /** Les fiches proposées à la frappe. */
  tuteursTrouves: TuteurRecherche[] = [];

  rechercheEnCours = false;

  /**
   * La fiche rattachée, quand l'agent en a choisi une dans l'annuaire.
   *
   * Tant qu'elle est posée, le bloc tuteur est verrouillé et seul son `id`
   * part au serveur : c'est ce qui évite le doublon pour une fratrie. La
   * détacher (`detacherTuteur`) rend la saisie manuelle.
   */
  tuteurRattache: TuteurRecherche | null = null;

  /** Depend de la route, pas de l'eleve : celui-ci se charge de facon asynchrone. */
  get isEdit(): boolean {
    return this.modeEdition;
  }

  ngOnInit(): void {
    // Le backend exige etablissement_origine des que l'eleve est transfere.
    // On applique la meme regle cote client pour eviter un aller-retour 422.
    this.identiteForm
      .get('statut_inscription')!
      .valueChanges.subscribe((statut) => this.syncEtablissementOrigine(statut));

    // Idem : le NIN n'est exige que si le tuteur n'est ni le pere ni la mere.
    // Et si le tuteur EST le pere ou la mere, on pre-remplit ses champs depuis
    // les informations parentales deja saisies.
    this.tuteurForm
      .get('lien_parente')!
      .valueChanges.subscribe((lien) => this.onLienParenteChange(lien));

    // L'annuaire des tuteurs. Le debounce evite un appel par touche frappee ;
    // switchMap abandonne la reponse d'une recherche devenue obsolete, sans
    // quoi une requete lente pourrait ecraser le resultat d'une plus recente.
    this.rechercheTuteur.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((terme) => {
          this.rechercheEnCours = true;

          return this.annuaireTuteur.rechercher(terme ?? '');
        })
      )
      .subscribe({
        next: (tuteurs) => {
          this.rechercheEnCours = false;
          this.tuteursTrouves = tuteurs;
        },
        // Un annuaire indisponible ne doit pas bloquer la saisie : on retombe
        // sur le formulaire manuel, qui reste parfaitement valable.
        error: () => {
          this.rechercheEnCours = false;
          this.tuteursTrouves = [];
        }
      });

    // L'annuaire des tuteurs. Le debounce evite un appel par touche frappee ;
    // switchMap abandonne la reponse d'une recherche devenue obsolete, sans
    // quoi une requete lente pourrait ecraser le resultat d'une plus recente.
    this.rechercheTuteur.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((terme) => {
          this.rechercheEnCours = true;

          return this.annuaireTuteur.rechercher(terme ?? '');
        })
      )
      .subscribe({
        next: (tuteurs) => {
          this.rechercheEnCours = false;
          this.tuteursTrouves = tuteurs;
        },
        // Un annuaire indisponible ne doit pas bloquer la saisie : on retombe
        // sur le formulaire manuel, qui reste parfaitement valable.
        error: () => {
          this.rechercheEnCours = false;
          this.tuteursTrouves = [];
        }
      });

    if (!this.modeEdition) return;

    // Route d'edition sans state (URL saisie directement) : l'eleve est
    // inconnu. Mieux vaut revenir a la liste que d'afficher un formulaire vide
    // qui creerait un doublon a l'enregistrement. Un rafraichissement, lui,
    // conserve le state et recharge donc la bonne fiche.
    if (this.eleveId === null) {
      this.notificationService.info(
        'Sélectionnez un élève dans la liste pour le modifier.'
      );
      this.retour();
      return;
    }

    this.charger(this.eleveId);
  }

  private charger(id: number): void {
    this.chargement = true;

    this.eleveService.getById(id).subscribe({
      next: (eleve) => {
        this.chargement = false;

        if (!eleve) {
          this.notificationService.error('Élève introuvable');
          this.retour();
          return;
        }

        this.eleve = eleve;
        this.patchFromEleve(eleve);
      },
      error: () => {
        this.chargement = false;
        this.notificationService.error("Erreur lors du chargement de l'élève");
        this.retour();
      }
    });
  }

  private patchFromEleve(eleve: Eleve): void {
    // Pendant le chargement, on ne veut pas ecraser les infos tuteur existantes
    // par l'auto-remplissage declenche par le patch de lien_parente.
    this.chargementEnCours = true;

    this.identiteForm.patchValue({
      ...eleve,
      date_naissance: eleve.date_naissance ? new Date(eleve.date_naissance) : null
    });
    this.medicalForm.patchValue(eleve);
    this.parentsForm.patchValue(eleve);

    if (eleve.tuteur) this.tuteurForm.patchValue(eleve.tuteur);

    this.chargementEnCours = false;

    this.syncEtablissementOrigine(eleve.statut_inscription);
    this.syncNinTuteur(eleve.tuteur?.lien_parente);
  }

  /**
   * Reagit au choix du lien de parente : ajuste la contrainte NIN, et si le
   * tuteur est le pere ou la mere, pre-remplit ses champs a partir des infos
   * parentales deja saisies (sans ecraser avec des valeurs vides).
   */
  private onLienParenteChange(lien: string | null | undefined): void {
    this.syncNinTuteur(lien);
    if (this.chargementEnCours) return;
    if (lien === 'PERE' || lien === 'MERE') {
      this.remplirTuteurDepuisParent(lien);
    }
  }

  private remplirTuteurDepuisParent(lien: 'PERE' | 'MERE'): void {
    const parents = this.parentsForm.value;
    const suffixe = lien === 'PERE' ? 'pere' : 'mere';

    // tuteurForm -> parentsForm
    const correspondances: Record<string, string> = {
      nom: `nom_${suffixe}`,
      prenom: `prenom_${suffixe}`,
      telephone_principal: `telephone_${suffixe}`,
      profession: `profession_${suffixe}`,
      adresse: `adresse_${suffixe}`
    };

    const patch: Record<string, unknown> = {};
    for (const [champTuteur, champParent] of Object.entries(correspondances)) {
      const valeur = parents[champParent];
      // On ne recopie que les champs deja remplis.
      if (valeur != null && String(valeur).trim() !== '') {
        patch[champTuteur] = valeur;
      }
    }

    this.tuteurForm.patchValue(patch);
  }

  private syncEtablissementOrigine(statut: string): void {
    this.setRequired(
      this.identiteForm.get('etablissement_origine')!,
      statut === 'TRANSFERE',
      255
    );
  }

  /**
   * Ajuste les champs du tuteur au lien de parenté déclaré.
   *
   * Père ou mère : les coordonnées viennent du bloc parent, le serveur les
   * recopie sur la fiche tuteur. Les exiger ici aussi rendrait le formulaire
   * invalide sans recours, les champs étant masqués.
   *
   * Le bloc parent correspondant devient obligatoire en retour — voir
   * `syncParentTuteur`.
   */
  private syncNinTuteur(lien: string | null | undefined): void {
    const tiers = tuteurEstUnTiers(lien as never);

    this.setRequired(this.tuteurForm.get('nin')!, tiers, 30);

    this.setRequired(this.tuteurForm.get('nom')!, tiers, 255);
    this.setRequired(this.tuteurForm.get('prenom')!, tiers, 255);
    this.setRequired(this.tuteurForm.get('telephone_principal')!, tiers, 20);
    this.setRequired(this.tuteurForm.get('adresse')!, tiers, 255);

    this.syncParentTuteur(lien);
  }

  /**
   * Rend obligatoire le bloc du parent désigné comme tuteur : il devient la
   * seule source de ses coordonnées, et une fiche tuteur sans nom ni téléphone
   * serait inutilisable (ni recouvrement, ni messagerie — le téléphone est
   * l'identifiant de connexion des familles).
   */
  private syncParentTuteur(lien: string | null | undefined): void {
    const estPere = lien === 'PERE';
    const estMere = lien === 'MERE';

    this.setRequired(this.parentsForm.get('nom_pere')!, estPere, 255);
    this.setRequired(this.parentsForm.get('prenom_pere')!, estPere, 255);
    this.setRequired(this.parentsForm.get('telephone_pere')!, estPere, 20);

    this.setRequired(this.parentsForm.get('nom_mere')!, estMere, 255);
    this.setRequired(this.parentsForm.get('prenom_mere')!, estMere, 255);
    this.setRequired(this.parentsForm.get('telephone_mere')!, estMere, 20);
  }

  /**
   * Rattache une fiche existante choisie dans l'annuaire.
   *
   * Le formulaire est rempli et reste modifiable : la fiche est commune à la
   * fratrie, et une correction saisie ici (téléphone, adresse) doit bien
   * profiter à tous les enfants qui la partagent — c'est l'intérêt d'une
   * fiche unique. L'écran prévient de la portée du changement.
   *
   * L'`id` accompagne les coordonnées au serveur (voir `onSubmit`) : c'est lui
   * qui dit « mets à jour cette fiche » plutôt que « crées-en une nouvelle ».
   */
  rattacherTuteur(tuteur: TuteurRecherche): void {
    this.tuteurRattache = tuteur;

    this.tuteurForm.patchValue({
      lien_parente: tuteur.lien_parente,
      nom: tuteur.nom,
      prenom: tuteur.prenom,
      nin: tuteur.nin ?? '',
      telephone_principal: tuteur.telephone_principal,
      telephone_secondaire: tuteur.telephone_secondaire ?? '',
      email: tuteur.email ?? '',
      profession: tuteur.profession ?? '',
      adresse: tuteur.adresse
    });

    // Les champs restent modifiables : corriger le telephone du tuteur depuis
    // la fiche d'un enfant doit bien mettre a jour la fratrie qui le partage.
    // C'est le propre d'une fiche commune, et l'ecran l'annonce clairement.
    this.syncNinTuteur(tuteur.lien_parente);

    this.tuteursTrouves = [];
    this.rechercheTuteur.setValue('', { emitEvent: false });
  }

  /**
   * Détache la fiche et rend la saisie manuelle : l'agent s'est trompé de
   * tuteur, ou la famille n'était finalement pas celle-là.
   */
  detacherTuteur(): void {
    this.tuteurRattache = null;

    this.tuteurForm.enable({ emitEvent: false });
    this.tuteurForm.reset({
      lien_parente: '',
      nom: '',
      prenom: '',
      nin: '',
      telephone_principal: '',
      telephone_secondaire: '',
      email: '',
      profession: '',
      adresse: ''
    });

    // reset() a remis lien_parente a vide : on realigne les validateurs, que
    // le rattachement avait calcules pour l'ancien lien.
    this.syncNinTuteur('');
  }

  /** Bascule `required` en conservant la contrainte de longueur du champ. */
  private setRequired(
    control: AbstractControl,
    required: boolean,
    maxLength: number
  ): void {
    control.setValidators(
      required
        ? [Validators.required, Validators.maxLength(maxLength)]
        : [Validators.maxLength(maxLength)]
    );
    control.updateValueAndValidity({ emitEvent: false });
  }

  get ninRequis(): boolean {
    return tuteurEstUnTiers(this.tuteurForm.get('lien_parente')?.value);
  }

  get transfere(): boolean {
    return this.identiteForm.get('statut_inscription')?.value === 'TRANSFERE';
  }

  /**
   * Vrai quand le tuteur est le père ou la mère : ses coordonnées viennent
   * alors du bloc parent, et le formulaire n'a plus à les redemander.
   */
  get tuteurEstUnParent(): boolean {
    const lien = this.tuteurForm.get('lien_parente')?.value;

    return lien === 'PERE' || lien === 'MERE';
  }

  /** « père » ou « mère », pour l'annonce affichée à la place des champs. */
  get parentTuteurLibelle(): string {
    return this.tuteurForm.get('lien_parente')?.value === 'PERE'
      ? 'du père'
      : 'de la mère';
  }

  /**
   * Les formulaires dans l'ordre des etapes : l'index d'une etape est aussi
   * celui de son formulaire, ce qui permet de verrouiller la navigation
   * (`etapeAutorisee`) sans dupliquer cette correspondance dans le template.
   */
  private get formulairesParEtape(): FormGroup[] {
    return [
      this.identiteForm,
      this.medicalForm,
      this.parentsForm,
      this.tuteurForm
    ];
  }

  /**
   * Avance d'une etape, mais seulement si l'etape courante est valide.
   *
   * `matStepperNext` seul ne suffit pas : en mode lineaire il refuse bien
   * d'avancer, mais sans rien afficher — les champs jamais touches restent
   * vierges et l'agent voit un bouton qui « ne marche pas ». On marque donc
   * les champs pour reveler les messages d'erreur avant de bloquer.
   */
  etapeSuivante(form: FormGroup): void {
    if (form.invalid) {
      form.markAllAsTouched();
      this.notificationService.info(
        'Complétez les champs obligatoires avant de continuer.'
      );
      return;
    }

    this.stepper?.next();
  }

  /**
   * Vrai si l'etape visee est accessible depuis l'etape courante.
   *
   * En creation, on n'autorise que le retour en arriere et l'etape suivante
   * immediate, cette derniere a condition que l'etape courante soit valide.
   *
   * `[linear]` ne suffit pas ici : Material n'y bloque une etape que si une
   * etape *precedente* est invalide. Or « Medical » et « Parents » n'ont aucun
   * champ obligatoire, donc toujours valides — un clic direct sur l'en-tete
   * « Tuteur légal » sautait ainsi par-dessus « Identité » incomplet.
   */
  private etapeAutorisee(cible: number): boolean {
    if (this.isEdit) return true;

    const courante = this.stepper?.selectedIndex ?? 0;

    if (cible <= courante) return true;
    if (cible > courante + 1) return false;

    return this.formulairesParEtape[courante]?.valid !== false;
  }

  /**
   * Interdit le clic sur un en-tete d'etape non encore accessible.
   *
   * Branche sur `(selectionChange)` plutot que sur un `[disabled]` : Material
   * n'expose pas d'entree pour desactiver un en-tete, et un `pointer-events`
   * CSS laisserait passer la navigation au clavier.
   */
  onEtapeChange(event: { selectedIndex: number; previouslySelectedIndex: number }): void {
    const { selectedIndex, previouslySelectedIndex } = event;

    this.majTraitsParcourus(selectedIndex);

    if (selectedIndex <= previouslySelectedIndex) return;
    if (this.etapeAutorisee(selectedIndex)) return;

    const bloquant = this.formulairesParEtape[previouslySelectedIndex];
    bloquant?.markAllAsTouched();

    this.notificationService.info(
      'Complétez les champs obligatoires avant de continuer.'
    );

    // Le changement a deja eu lieu : on revient sur l'etape a completer.
    // Hors du cycle courant, sinon le stepper ecrase la correction.
    setTimeout(() => {
      if (this.stepper) this.stepper.selectedIndex = previouslySelectedIndex;
    });
  }

  /**
   * Colore les traits situes avant l'etape courante, pour que l'en-tete se
   * lise comme une barre de progression.
   *
   * Les traits sont rendus par Material entre les en-tetes, hors de notre
   * template : on ne peut donc pas leur poser une classe par binding. Un
   * `:has()` en CSS aurait evite ce code, mais la cible du projet inclut des
   * navigateurs qui ne le supportent pas encore.
   */
  private majTraitsParcourus(indexCourant: number): void {
    const traits = this.host.nativeElement.querySelectorAll<HTMLElement>(
      '.mat-stepper-horizontal-line'
    );

    // Le trait d'indice i separe l'etape i de l'etape i+1 : il est parcouru
    // des que l'etape courante lui est posterieure.
    traits.forEach((trait, i) =>
      trait.classList.toggle('eleve-stepper-line-done', i < indexCourant)
    );
  }

  /** Vrai quand l'etape courante interdit de passer a la suivante. */
  etapeIncomplete(form: FormGroup): boolean {
    return !this.isEdit && form.invalid;
  }

  get canSubmit(): boolean {
    return (
      !this.loading &&
      !this.chargement &&
      this.identiteForm.valid &&
      this.medicalForm.valid &&
      this.parentsForm.valid &&
      this.tuteurForm.valid
    );
  }

  onSubmit(): void {
    if (!this.canSubmit) {
      this.identiteForm.markAllAsTouched();
      this.medicalForm.markAllAsTouched();
      this.parentsForm.markAllAsTouched();
      this.tuteurForm.markAllAsTouched();
      return;
    }

    this.loading = true;

    const identite = this.identiteForm.value;
    const payload: EleveRequest = {
      eleve: {
        ...cleanupValues(identite),
        ...cleanupValues(this.medicalForm.value),
        ...cleanupValues(this.parentsForm.value),
        date_naissance: toApiDate(identite.date_naissance)!,
        // Le backend l'efface de toute facon hors transfert, mais autant ne
        // pas envoyer une valeur qui n'a plus de sens.
        etablissement_origine: this.transfere
          ? trimOrNull(identite.etablissement_origine)
          : null
      },
      tuteur: {
        ...cleanupValues(this.tuteurForm.value),
        // L'identifiant de la fiche a mettre a jour : celle choisie dans
        // l'annuaire, ou celle deja rattachee a l'eleve en modification.
        // Sans lui, le serveur creerait un doublon a chaque enregistrement.
        ...(this.tuteurRattache?.id ?? this.eleve?.tuteur_id
          ? { id: this.tuteurRattache?.id ?? this.eleve?.tuteur_id }
          : {})
      }
    } as EleveRequest;

    const request$ =
      this.modeEdition && this.eleveId !== null
        ? this.eleveService.update(this.eleveId, payload)
        : this.eleveService.create(payload);

    request$.subscribe({
      next: (res) => {
        this.loading = false;
        this.notificationService.success(res.message);

        const id = res.payload?.id ?? this.eleveId;

        if (!id) {
          this.router.navigate([ROUTE_ELEVES(this.router)]);
          return;
        }

        // Une modification revient a la fiche : rien n'a a etre enchaine.
        //
        // Une creation, elle, part directement sur l'inscription. Creer un
        // eleve n'a de sens que pour l'inscrire : s'arreter a la fiche laissait
        // sortir de la saisie avec un eleve sans inscription, et la base en
        // accumulait. L'ecran d'inscription arrive avec l'eleve deja
        // selectionne et verrouille (voir InscriptionAddComponent).
        //
        // L'identifiant passe par le state, l'URL reste sans parametre.
        const suite =
          this.modeEdition || !peutSaisirInscription(this.authService.getRole(), this.router)
            ? ROUTE_ELEVE_DETAIL(this.router)
            : ROUTE_INSCRIPTION_AJOUT(this.router);

        this.router.navigate([suite], { state: { [STATE_ELEVE_ID]: id } });
      },
      error: (err) => {
        this.loading = false;
        this.notificationService.error(
          err?.error?.message ??
            (this.isEdit
              ? 'Erreur lors de la mise à jour'
              : "Erreur lors de la création de l'élève")
        );
      }
    });
  }

  retour(): void {
    this.router.navigate([ROUTE_ELEVES(this.router)]);
  }
}
