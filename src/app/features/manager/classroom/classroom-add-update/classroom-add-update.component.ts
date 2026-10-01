import { CommonModule } from '@angular/common';
import { Component, Inject, inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { forkJoin } from 'rxjs';
import { AnneeScolaireService } from 'src/app/auth/services/annee-scolaire.service';
import { ClasseService } from 'src/app/auth/services/classe.service';
import { NiveauService } from 'src/app/auth/services/niveau.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import { AnneeScolaire } from 'src/app/interfaces/AnneeScolaire';
import { Classe } from 'src/app/interfaces/Classe';
import { Niveau } from 'src/app/interfaces/Niveau';

interface DialogData {
  isEdit: boolean;
  classe?: Classe;
}

@Component({
  selector: 'vex-classroom-add-update',
  templateUrl: './classroom-add-update.component.html',
  styleUrls: ['./classroom-add-update.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule
  ]
})
export class ClassroomAddUpdateComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef =
    inject<MatDialogRef<ClassroomAddUpdateComponent, boolean>>(MatDialogRef);
  private readonly classeService = inject(ClasseService);
  private readonly niveauService = inject(NiveauService);
  private readonly anneeScolaireService = inject(AnneeScolaireService);
  private readonly notificationService = inject(NotificationService);

  loading = false;
  loadingRefs = true;

  niveaux: Niveau[] = [];
  anneeEnCours?: AnneeScolaire;

  form: FormGroup = this.fb.group({
    nom: ['', [Validators.required, Validators.maxLength(100)]],
    code: ['', [Validators.maxLength(20)]],
    effectif_max: [null as number | null, [Validators.min(1)]],
    niveau_id: [null as number | null, [Validators.required]]
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: DialogData) {}

  ngOnInit(): void {
    if (this.data.isEdit && this.data.classe) {
      const { nom, code, effectif_max, niveau_id } = this.data.classe;
      this.form.patchValue({ nom, code, effectif_max, niveau_id });
    }

    // getList() pagine a 10 par defaut : on elargit pour etre sur d'avoir
    // l'annee en cours dans la page.
    forkJoin({
      niveaux: this.niveauService.getAll(),
      annees: this.anneeScolaireService.getList(1, 100)
    }).subscribe({
      next: ({ niveaux, annees }) => {
        this.niveaux = niveaux;
        this.anneeEnCours = annees.find((a) => a.en_cours);
        this.loadingRefs = false;

        if (!this.data.isEdit && !this.anneeEnCours) {
          this.notificationService.warning(
            'Aucune année scolaire en cours : impossible de créer une classe.'
          );
        }
      },
      error: () => {
        this.loadingRefs = false;
        this.notificationService.error(
          'Erreur lors du chargement des niveaux et années scolaires'
        );
      }
    });
  }

  /**
   * L'annee scolaire n'est pas saisie : la liste ne montre que l'annee en
   * cours, une classe creee sur une autre annee y serait invisible. En
   * edition, on conserve celle de la classe.
   */
  private get anneeScolaireId(): number | undefined {
    return this.data.isEdit && this.data.classe
      ? this.data.classe.annee_scolaire_id
      : this.anneeEnCours?.id;
  }

  get anneeLabel(): string {
    if (this.data.isEdit && this.data.classe?.annee_scolaire) {
      return this.data.classe.annee_scolaire.nom;
    }
    return this.anneeEnCours?.nom ?? '—';
  }

  get canSubmit(): boolean {
    return (
      !this.loading &&
      !this.loadingRefs &&
      this.form.valid &&
      this.anneeScolaireId !== undefined
    );
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const anneeScolaireId = this.anneeScolaireId;

    if (anneeScolaireId === undefined) {
      this.notificationService.error(
        "Aucune année scolaire en cours : impossible d'enregistrer la classe."
      );
      return;
    }

    this.loading = true;

    const raw = this.form.value;
    const payload = {
      nom: raw.nom,
      // Le backend valide `nullable` : '' ne doit pas etre envoye.
      code: raw.code || null,
      effectif_max: raw.effectif_max ?? null,
      niveau_id: raw.niveau_id,
      annee_scolaire_id: anneeScolaireId
    };

    const request$ =
      this.data.isEdit && this.data.classe
        ? this.classeService.update(this.data.classe.id, payload)
        : this.classeService.create(payload);

    request$.subscribe({
      next: (res) => {
        this.loading = false;
        this.notificationService.success(res.message);
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.loading = false;
        this.notificationService.error(
          err?.error?.message ??
            (this.data.isEdit
              ? 'Erreur lors de la mise à jour'
              : 'Erreur lors de la création')
        );
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
