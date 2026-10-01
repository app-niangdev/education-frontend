import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  FormControl,
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
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { fadeInRight400ms } from '@vex/animations/fade-in-right.animation';
import { scaleIn400ms } from '@vex/animations/scale-in.animation';
import { catchError, debounceTime, distinctUntilChanged, forkJoin, of, switchMap, tap } from 'rxjs';
import { ClasseService } from 'src/app/auth/services/classe.service';
import { EleveService } from 'src/app/auth/services/eleve.service';
import { FraisScolaireService } from 'src/app/auth/services/frais-scolaire.service';
import { InscriptionService } from 'src/app/auth/services/inscription.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import { Classe } from 'src/app/interfaces/Classe';
import { Eleve, InscriptionEleve } from 'src/app/interfaces/Eleve';
import { FraisScolaire } from 'src/app/interfaces/FraisScolaire';
import { toApiDate } from '../../eleve/eleve-form.utils';
import {
  lireEleveIdDepuisState,
  ROUTE_INSCRIPTIONS
} from '../../eleve/eleve-navigation';

@Component({
  selector: 'vex-inscription-add',
  templateUrl: './inscription-add.component.html',
  styleUrls: ['./inscription-add.component.scss'],
  animations: [scaleIn400ms, fadeInRight400ms],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ]
})
export class InscriptionAddComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly inscriptionService = inject(InscriptionService);
  private readonly eleveService = inject(EleveService);
  private readonly classeService = inject(ClasseService);
  private readonly fraisScolaireService = inject(FraisScolaireService);
  private readonly notificationService = inject(NotificationService);

  /**
   * Eleve pre-selectionne, transmis par le state.
   *
   * Il vient de la fiche eleve, de la liste, ou de la creation qui enchaine
   * directement ici. Dans ces trois cas l'eleve est deja connu : le champ est
   * alors verrouille, le rouvrir n'ouvrirait que la porte a une erreur de
   * saisie. Sans state — c'est-a-dire une reinscription, ou l'on part de la
   * liste des inscriptions — le champ reste libre.
   *
   * Lu des le constructeur, getCurrentNavigation() etant deja null en ngOnInit.
   */
  private readonly eleveIdPreselectionne = lireEleveIdDepuisState(this.router);

  /**
   * Vrai tant que l'eleve reste impose : le champ est verrouille et l'ecran
   * affiche son identite plutot qu'une liste deroulante.
   *
   * Se lit sur le controle lui-meme, et non sur le state : `libererChampEleve`
   * rouvre le choix quand la fiche imposee n'a pas pu etre chargee.
   */
  get eleveImpose(): boolean {
    return this.form.get('eleve_id')!.disabled;
  }

  loading = false;
  chargement = true;

  /**
   * Les eleves proposes dans la liste deroulante.
   *
   * Ce n'est jamais l'ensemble des eleves de l'ecole : la liste est le
   * resultat d'une recherche cote serveur, bornee a LIMITE_RECHERCHE. Un
   * etablissement de plusieurs centaines d'eleves rendrait le select
   * inutilisable — et surtout impossible a parcourir pour retrouver un nom.
   */
  eleves: Eleve[] = [];
  classes: Classe[] = [];

  /** Le champ de recherche loge dans le select. */
  readonly rechercheEleve = new FormControl('', { nonNullable: true });

  rechercheEnCours = false;

  /**
   * Nombre d'eleves rapportes par recherche.
   *
   * Assez pour que le bon figure presque toujours dans la liste, assez peu
   * pour que le menu reste parcourable d'un coup d'oeil. Au-dela, l'ecran
   * invite a preciser la recherche plutot que de faire defiler.
   */
  private readonly LIMITE_RECHERCHE = 20;

  /**
   * Vrai quand la recherche a ete tronquee : d'autres eleves correspondent
   * mais ne sont pas affiches. Le taire laisserait croire que l'eleve absent
   * de la liste n'existe pas.
   */
  resultatsTronques = false;

  /** Grille tarifaire : seule source des montants (année scolaire + niveau). */
  baremes: FraisScolaire[] = [];

  /** Fiche complete de l'eleve choisi : sert a deviner nouvelle/reinscription. */
  eleveSelectionne?: Eleve;
  chargementEleve = false;

  form: FormGroup = this.fb.group({
    eleve_id: [null as number | null, [Validators.required]],
    classe_id: [null as number | null, [Validators.required]],
    date_inscription: [new Date() as Date | null]
  });

  ngOnInit(): void {
    // La liste des eleves n'est plus chargee ici : elle vient d'une recherche
    // serveur, declenchee a la frappe (voir ecouterRecherche).
    forkJoin({
      classes: this.classeService.getAll(),
      baremes: this.fraisScolaireService.getAll()
    }).subscribe({
      next: ({ classes, baremes }) => {
        this.classes = classes;
        this.baremes = baremes;
        this.chargement = false;

        if (!classes.length) {
          this.notificationService.warning(
            "Aucune classe pour l'année scolaire en cours : créez-en une avant d'inscrire un élève."
          );
        }

        // Arrivee depuis la fiche, la liste, ou la creation qui enchaine ici.
        // patchValue declenche valueChanges, qui charge l'historique : pas
        // d'appel supplementaire.
        //
        // Le champ est ensuite verrouille : l'eleve est deja decide, le laisser
        // modifiable n'ouvrirait que la porte a une inscription posee sur le
        // mauvais dossier. `emitEvent: false` evite de relancer le chargement
        // que patchValue vient de declencher.
        if (this.eleveIdPreselectionne !== null) {
          this.form.patchValue({ eleve_id: this.eleveIdPreselectionne });
          this.form.get('eleve_id')!.disable({ emitEvent: false });
        }
      },
      error: () => {
        this.chargement = false;
        this.notificationService.error(
          'Erreur lors du chargement des classes'
        );
      }
    });

    this.form.get('eleve_id')!.valueChanges.subscribe((id) => {
      if (id) this.chargerEleve(id);
      else this.eleveSelectionne = undefined;
    });

    this.ecouterRecherche();

    // Une premiere recherche a vide amorce la liste : le select n'est jamais
    // ouvert sur un menu vide, meme avant que l'agent n'ait tape quoi que ce
    // soit. Inutile quand l'eleve est deja impose par le state.
    if (this.eleveIdPreselectionne === null) this.rechercherEleves('');
  }

  /**
   * Interroge la base a chaque frappe.
   *
   * `debounceTime` evite une requete par caractere, `distinctUntilChanged`
   * ignore les frappes qui ne changent pas le texte (fleches, Ctrl…), et
   * `switchMap` annule la requete precedente : sans lui, deux reponses
   * revenues dans le desordre feraient clignoter la liste, et la plus lente
   * — donc la plus ancienne — ecraserait la plus recente.
   */
  private ecouterRecherche(): void {
    this.rechercheEleve.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        tap(() => (this.rechercheEnCours = true)),
        switchMap((terme) =>
          this.eleveService.rechercher(terme.trim(), this.LIMITE_RECHERCHE)
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((resultat) => this.appliquerResultats(resultat));
  }

  /** Recherche declenchee hors saisie (amorce de la liste). */
  private rechercherEleves(terme: string): void {
    this.rechercheEnCours = true;

    this.eleveService
      .rechercher(terme, this.LIMITE_RECHERCHE)
      .subscribe((resultat) => this.appliquerResultats(resultat));
  }

  /**
   * Range les resultats dans la liste du select.
   *
   * L'eleve deja choisi y est reinjecte s'il n'en fait pas partie : `mat-select`
   * affiche le libelle de l'option correspondant a la valeur, et une recherche
   * ulterieure qui ne le ramene pas viderait le champ a l'ecran alors que la
   * valeur, elle, est toujours posee.
   */
  private appliquerResultats({
    eleves,
    total
  }: {
    eleves: Eleve[];
    total: number;
  }): void {
    this.rechercheEnCours = false;

    // Le total porte le nombre de correspondances au-dela de la tranche
    // demandee : c'est lui qui dit si la liste est tronquee.
    this.resultatsTronques = total > eleves.length;

    // L'eleve choisi est conserve en tete s'il sort des resultats. On se
    // rabat sur l'entree deja presente dans la liste tant que sa fiche
    // complete n'est pas revenue du serveur : entre le clic et cette reponse,
    // `eleveSelectionne` est encore vide, et une recherche lancee dans cet
    // intervalle viderait le libelle affiche.
    const idChoisi = this.form.getRawValue().eleve_id;

    const choisi =
      this.eleveSelectionne?.id === idChoisi
        ? this.eleveSelectionne
        : this.eleves.find((e) => e.id === idChoisi);

    this.eleves =
      choisi && !eleves.some((e) => e.id === choisi.id)
        ? [choisi, ...eleves]
        : eleves;
  }

  /** La liste ne porte pas les inscriptions : la fiche complete, si. */
  private chargerEleve(id: number): void {
    this.chargementEleve = true;

    this.eleveService.getById(id).subscribe({
      next: (eleve) => {
        this.chargementEleve = false;
        this.eleveSelectionne = eleve ?? undefined;

        // Eleve impose mais introuvable : le champ etant verrouille, l'ecran
        // resterait sans issue. On le rouvre pour laisser choisir.
        if (!eleve) this.libererChampEleve();
      },
      error: () => {
        this.chargementEleve = false;
        this.libererChampEleve();
      }
    });
  }

  /**
   * Rend le choix de l'eleve a l'utilisateur. Reserve aux cas ou l'eleve impose
   * n'a pas pu etre charge : sans cela, le formulaire serait bloque sur une
   * fiche qu'il ne peut ni afficher ni changer.
   */
  private libererChampEleve(): void {
    const control = this.form.get('eleve_id')!;

    if (control.enabled) return;

    control.enable({ emitEvent: false });
    control.reset(null, { emitEvent: false });

    this.notificationService.warning(
      "L'élève n'a pas pu être chargé : sélectionnez-le dans la liste."
    );
  }

  get classeSelectionnee(): Classe | undefined {
    const id = this.form.get('classe_id')?.value;
    return this.classes.find((c) => c.id === id);
  }

  /**
   * Barème applicable : celui du couple (année scolaire de la classe, niveau).
   * Absent tant qu'aucun tarif n'a été saisi dans « Frais scolaire ».
   */
  get baremeSelectionne(): FraisScolaire | undefined {
    const classe = this.classeSelectionnee;

    if (!classe) return undefined;

    return this.baremes.find(
      (b) =>
        b.annee_scolaire_id === classe.annee_scolaire_id &&
        b.niveau_id === classe.niveau_id
    );
  }

  /** Le montant fait foi cote serveur : ici, simple information prealable. */
  get montantInscription(): number | null {
    return this.baremeSelectionne?.montant_inscription ?? null;
  }

  /**
   * Sans barème, le serveur refusera l'inscription : on prévient avant l'envoi
   * plutôt que de laisser tomber un 422.
   */
  get baremeManquant(): boolean {
    return !!this.classeSelectionnee && !this.baremeSelectionne;
  }

  private get inscriptionsEleve(): InscriptionEleve[] {
    return this.eleveSelectionne?.inscriptions ?? [];
  }

  /**
   * Le backend tranche seul, en cherchant une inscription sur une AUTRE annee
   * scolaire. On ne fait qu'anticiper l'affichage : une inscription sur
   * l'annee en cours ne rend pas celle-ci une reinscription.
   */
  get estReinscription(): boolean {
    return this.inscriptionsEleve.some((i) => i.annee_scolaire?.en_cours === false);
  }

  get typeLabel(): string {
    return this.estReinscription ? 'Réinscription' : 'Nouvelle inscription';
  }

  /**
   * Le backend impose l'unicite (eleve, annee_scolaire) et compte meme les
   * inscriptions annulees : on previent avant l'envoi plutot que de laisser
   * tomber un 422.
   */
  get dejaInscritCetteAnnee(): boolean {
    return this.inscriptionsEleve.some((i) => i.annee_scolaire?.en_cours === true);
  }

  get inscriptionCetteAnnee(): InscriptionEleve | undefined {
    return this.inscriptionsEleve.find((i) => i.annee_scolaire?.en_cours === true);
  }

  get canSubmit(): boolean {
    return (
      !this.loading &&
      !this.chargement &&
      !this.chargementEleve &&
      !this.dejaInscritCetteAnnee &&
      !this.baremeManquant &&
      this.form.valid
    );
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;

    // getRawValue() et non value : le champ eleve est desactive quand l'eleve
    // est impose, et `value` omet les controles desactives — l'eleve partirait
    // alors vide au serveur.
    const raw = this.form.getRawValue();

    this.inscriptionService
      .create({
        eleve_id: raw.eleve_id,
        classe_id: raw.classe_id,
        date_inscription: toApiDate(raw.date_inscription)
      })
      .subscribe({
        next: (res) => {
          this.loading = false;
          this.notificationService.success(res.message);
          this.router.navigate([ROUTE_INSCRIPTIONS(this.router)]);
        },
        error: (err) => {
          this.loading = false;
          this.notificationService.error(
            err?.error?.message ?? "Erreur lors de la création de l'inscription"
          );
        }
      });
  }

  retour(): void {
    this.router.navigate([ROUTE_INSCRIPTIONS(this.router)]);
  }
}
