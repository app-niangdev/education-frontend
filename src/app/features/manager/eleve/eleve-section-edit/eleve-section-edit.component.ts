import { CommonModule } from '@angular/common';
import { Component, Inject, inject, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { EleveService } from 'src/app/auth/services/eleve.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import {
  APTITUDES_SPORTIVES,
  Eleve,
  EleveRequest,
  EleveSection,
  GROUPES_SANGUINS,
  STATUTS_INSCRIPTION
} from 'src/app/interfaces/Eleve';
import { LIENS_PARENTE, tuteurEstUnTiers } from 'src/app/interfaces/Tuteur';
import { cleanupValues, toApiDate } from '../eleve-form.utils';

export interface SectionDialogData {
  section: EleveSection;
  eleve: Eleve;
}

const TITRES: Record<EleveSection, string> = {
  identite: "Identité de l'élève",
  medical: 'Antécédents médicaux',
  scolarite: 'Scolarité',
  parents: 'Parents',
  tuteur: 'Tuteur légal'
};

const ICONES: Record<EleveSection, string> = {
  identite: 'mat:person',
  medical: 'mat:assignment',
  scolarite: 'mat:school',
  parents: 'mat:contacts',
  tuteur: 'mat:verified_user'
};

@Component({
  selector: 'vex-eleve-section-edit',
  templateUrl: './eleve-section-edit.component.html',
  styleUrls: ['./eleve-section-edit.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatRadioModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule
  ]
})
export class EleveSectionEditComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef =
    inject<MatDialogRef<EleveSectionEditComponent, boolean>>(MatDialogRef);
  private readonly eleveService = inject(EleveService);
  private readonly notificationService = inject(NotificationService);

  readonly groupesSanguins = GROUPES_SANGUINS;
  readonly aptitudes = APTITUDES_SPORTIVES;
  readonly statuts = STATUTS_INSCRIPTION;
  readonly liensParente = LIENS_PARENTE;
  readonly maxDate = new Date();

  loading = false;
  form!: FormGroup;

  constructor(@Inject(MAT_DIALOG_DATA) public data: SectionDialogData) {}

  get titre(): string {
    return TITRES[this.data.section];
  }

  get icone(): string {
    return ICONES[this.data.section];
  }

  get section(): EleveSection {
    return this.data.section;
  }

  ngOnInit(): void {
    this.form = this.buildForm();

    if (this.section === 'scolarite') {
      this.form
        .get('statut_inscription')!
        .valueChanges.subscribe((s) => this.syncEtablissementOrigine(s));
      this.syncEtablissementOrigine(this.data.eleve.statut_inscription);
    }

    if (this.section === 'tuteur') {
      this.form
        .get('lien_parente')!
        .valueChanges.subscribe((l) => this.syncNin(l));
      this.syncNin(this.data.eleve.tuteur?.lien_parente);
    }
  }

  /** Chaque section n'expose que ses propres champs : le patch reste cible. */
  private buildForm(): FormGroup {
    const e = this.data.eleve;

    switch (this.section) {
      case 'identite':
        return this.fb.group({
          nom: [e.nom, [Validators.required, Validators.maxLength(255)]],
          prenom: [e.prenom, [Validators.required, Validators.maxLength(255)]],
          date_naissance: [
            e.date_naissance ? new Date(e.date_naissance) : null,
            [Validators.required]
          ],
          lieu_naissance: [e.lieu_naissance, [Validators.maxLength(255)]],
          sexe: [e.sexe, [Validators.required]],
          nationalite: [e.nationalite, [Validators.maxLength(100)]],
          adresse: [e.adresse, [Validators.maxLength(255)]],
          telephone: [e.telephone, [Validators.maxLength(20)]]
        });

      case 'medical':
        return this.fb.group({
          groupe_sanguin: [e.groupe_sanguin],
          aptitude_sportive: [e.aptitude_sportive],
          allergies: [e.allergies, [Validators.maxLength(2000)]],
          maladies_chroniques: [
            e.maladies_chroniques,
            [Validators.maxLength(2000)]
          ],
          consignes_urgence: [e.consignes_urgence, [Validators.maxLength(2000)]]
        });

      case 'scolarite':
        return this.fb.group({
          statut_inscription: [e.statut_inscription, [Validators.required]],
          etablissement_origine: [
            e.etablissement_origine,
            [Validators.maxLength(255)]
          ]
        });

      case 'parents':
        return this.fb.group({
          nom_pere: [e.nom_pere, [Validators.maxLength(255)]],
          prenom_pere: [e.prenom_pere, [Validators.maxLength(255)]],
          telephone_pere: [e.telephone_pere, [Validators.maxLength(20)]],
          profession_pere: [e.profession_pere, [Validators.maxLength(255)]],
          adresse_pere: [e.adresse_pere, [Validators.maxLength(255)]],

          nom_mere: [e.nom_mere, [Validators.maxLength(255)]],
          prenom_mere: [e.prenom_mere, [Validators.maxLength(255)]],
          telephone_mere: [e.telephone_mere, [Validators.maxLength(20)]],
          profession_mere: [e.profession_mere, [Validators.maxLength(255)]],
          adresse_mere: [e.adresse_mere, [Validators.maxLength(255)]]
        });

      case 'tuteur': {
        const t = e.tuteur;
        return this.fb.group({
          lien_parente: [t?.lien_parente ?? '', [Validators.required]],
          nom: [t?.nom ?? '', [Validators.required, Validators.maxLength(255)]],
          prenom: [
            t?.prenom ?? '',
            [Validators.required, Validators.maxLength(255)]
          ],
          nin: [t?.nin ?? '', [Validators.maxLength(30)]],
          telephone_principal: [
            t?.telephone_principal ?? '',
            [Validators.required, Validators.maxLength(20)]
          ],
          telephone_secondaire: [
            t?.telephone_secondaire ?? '',
            [Validators.maxLength(20)]
          ],
          email: [t?.email ?? '', [Validators.email, Validators.maxLength(255)]],
          profession: [t?.profession ?? '', [Validators.maxLength(255)]],
          adresse: [
            t?.adresse ?? '',
            [Validators.required, Validators.maxLength(255)]
          ]
        });
      }
    }
  }

  private syncEtablissementOrigine(statut: string): void {
    this.setRequired(
      this.form.get('etablissement_origine')!,
      statut === 'TRANSFERE',
      255
    );
  }

  /**
   * Ajuste les champs du tuteur au lien de parenté déclaré.
   *
   * Quand le tuteur est le père ou la mère, ses coordonnées sont déjà saisies
   * dans le bloc parent : le serveur les recopie et n'exige plus rien ici.
   * Laisser `required` sur ces champs rendait le formulaire indéfiniment
   * invalide — les champs sont masqués, donc impossibles à remplir, et le
   * bouton « Enregistrer » restait grisé.
   *
   * Le NIN suit la règle inverse : il ne devient obligatoire que pour un
   * tuteur tiers, dont il scelle les engagements financiers.
   */
  private syncNin(lien: string | null | undefined): void {
    const tiers = tuteurEstUnTiers(lien as never);

    this.setRequired(this.form.get('nin')!, tiers, 30);

    // Exigés du seul tuteur tiers : pour un parent, le bloc père/mère fait foi.
    this.setRequired(this.form.get('nom')!, tiers, 255);
    this.setRequired(this.form.get('prenom')!, tiers, 255);
    this.setRequired(this.form.get('telephone_principal')!, tiers, 20);
    this.setRequired(this.form.get('adresse')!, tiers, 255);
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

  get transfere(): boolean {
    return this.form?.get('statut_inscription')?.value === 'TRANSFERE';
  }

  get ninRequis(): boolean {
    return tuteurEstUnTiers(this.form?.get('lien_parente')?.value);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;

    // Seul le bloc concerne part : le backend laisse les autres intacts.
    const payload: EleveRequest =
      this.section === 'tuteur'
        ? {
            tuteur: {
              ...cleanupValues(this.form.value),
              // Met a jour la fiche rattachee plutot que d'en creer une autre.
              ...(this.data.eleve.tuteur_id
                ? { id: this.data.eleve.tuteur_id }
                : {})
            }
          }
        : { eleve: this.buildElevePayload() };

    this.eleveService.update(this.data.eleve.id, payload as EleveRequest).subscribe({
      next: (res) => {
        this.loading = false;
        this.notificationService.success(res.message);
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.loading = false;
        this.notificationService.error(
          err?.error?.message ?? 'Erreur lors de la mise à jour'
        );
      }
    });
  }

  private buildElevePayload(): Record<string, unknown> {
    const value = cleanupValues(this.form.value);

    if (this.section === 'identite') {
      return { ...value, date_naissance: toApiDate(this.form.value.date_naissance) };
    }

    if (this.section === 'scolarite' && !this.transfere) {
      // Hors transfert, l'etablissement d'origine n'a plus de sens.
      return { ...value, etablissement_origine: null };
    }

    return value;
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
