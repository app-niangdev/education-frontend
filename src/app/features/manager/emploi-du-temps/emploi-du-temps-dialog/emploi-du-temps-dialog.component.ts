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
import { AffectationService } from 'src/app/auth/services/affectation.service';
import { EmploiDuTempsService } from 'src/app/auth/services/emploi-du-temps.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import { Affectation } from 'src/app/interfaces/ClasseMatiere';
import {
  EmploiDuTemps,
  JOURS_SEMAINE,
  JourSemaine
} from 'src/app/interfaces/EmploiDuTemps';

interface DialogData {
  isEdit: boolean;
  classeId: number;
  classeNom: string;
  creneau?: EmploiDuTemps;
  /** Pré-remplissage depuis un clic sur une case de la grille. */
  prefill?: { jour: JourSemaine; heure_debut: string };
  /** Créneaux existants de la classe, pour empêcher un chevauchement. */
  creneaux?: EmploiDuTemps[];
}

/** Durées proposées, par pas de 30 min. */
const DUREES: { value: number; libelle: string }[] = [
  { value: 30, libelle: '30 min' },
  { value: 60, libelle: '1 h' },
  { value: 90, libelle: '1 h 30' },
  { value: 120, libelle: '2 h' },
  { value: 150, libelle: '2 h 30' },
  { value: 180, libelle: '3 h' },
  { value: 210, libelle: '3 h 30' },
  { value: 240, libelle: '4 h' }
];

/**
 * Ajout / edition d'un creneau de l'emploi du temps. Le contenu (matiere +
 * enseignant) est choisi parmi les affectations de la classe ; on ne saisit
 * ici que le jour, les horaires et la salle.
 */
@Component({
  selector: 'vex-emploi-du-temps-dialog',
  templateUrl: './emploi-du-temps-dialog.component.html',
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
export class EmploiDuTempsDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef =
    inject<MatDialogRef<EmploiDuTempsDialogComponent, boolean>>(MatDialogRef);
  private readonly edtService = inject(EmploiDuTempsService);
  private readonly affectationService = inject(AffectationService);
  private readonly notificationService = inject(NotificationService);

  readonly jours = JOURS_SEMAINE;
  readonly durees = DUREES;

  loading = false;
  loadingRefs = true;

  affectations: Affectation[] = [];

  form: FormGroup = this.fb.group({
    affectation_id: [null as number | null, [Validators.required]],
    jour: [null as string | null, [Validators.required]],
    heure_debut: ['08:00', [Validators.required]],
    duree: [60, [Validators.required, Validators.min(30)]],
    salle: ['']
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: DialogData) {}

  ngOnInit(): void {
    if (this.data.isEdit && this.data.creneau) {
      const c = this.data.creneau;
      const debut = (c.heure_debut ?? '').slice(0, 5);
      const fin = (c.heure_fin ?? '').slice(0, 5);
      this.form.patchValue({
        affectation_id: c.affectation_id,
        jour: c.jour,
        heure_debut: debut,
        duree: Math.max(30, this.toMinutes(fin) - this.toMinutes(debut)),
        salle: c.salle ?? ''
      });
      // Le jour et l'heure de début sont fixés par le créneau édité : on les
      // verrouille pour éviter de les changer par erreur.
      this.form.get('jour')?.disable();
      this.form.get('heure_debut')?.disable();
    } else if (this.data.prefill) {
      // Ajout depuis un clic sur la grille : jour + heure de début pré-remplis
      // et verrouillés (déterminés par la case cliquée).
      this.form.patchValue({
        jour: this.data.prefill.jour,
        heure_debut: this.data.prefill.heure_debut
      });
      this.form.get('jour')?.disable();
      this.form.get('heure_debut')?.disable();
    }

    // Flux « Ajouter » libre : si le jour ou l'heure de début changent, on
    // retronque la durée pour ne pas déborder sur la séance suivante.
    this.form.get('jour')?.valueChanges.subscribe(() => this.clampDuree());
    this.form.get('heure_debut')?.valueChanges.subscribe(() => this.clampDuree());
    this.clampDuree();

    this.affectationService.getByClasse(this.data.classeId).subscribe({
      next: (affectations) => {
        this.affectations = affectations;
        this.loadingRefs = false;
      },
      error: () => {
        this.loadingRefs = false;
        this.notificationService.error(
          'Erreur lors du chargement des matières de la classe'
        );
      }
    });
  }

  affectationLabel(a: Affectation): string {
    const matiere = a.classe_matiere?.matiere?.nom ?? 'Matière';
    const user = a.enseignant?.user;
    const nom = user
      ? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()
      : 'Non affecté';
    return `${matiere} — ${nom}`;
  }

  get canSubmit(): boolean {
    return !this.loading && !this.loadingRefs && this.form.valid;
  }

  /** 'HH:MM' -> minutes depuis minuit. */
  private toMinutes(hhmm: string): number {
    const [h, m] = (hhmm ?? '').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  /** minutes depuis minuit -> 'HH:MM'. */
  private toHHMM(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  /** Heure de fin calculée = heure de début + durée. */
  get heureFin(): string {
    // getRawValue() car heure_debut peut être désactivé (grille / édition).
    const raw = this.form.getRawValue();
    return this.toHHMM(this.toMinutes(raw.heure_debut) + (raw.duree || 0));
  }

  /**
   * Heure de début (en minutes) de la prochaine séance du même jour, ou null
   * s'il n'y en a pas. Le créneau en cours d'édition est exclu.
   */
  private prochaineSeanceMin(): number | null {
    const raw = this.form.getRawValue();
    const jour = raw.jour;
    const debut = this.toMinutes(raw.heure_debut);
    if (!jour || !raw.heure_debut) return null;

    const editedId = this.data.creneau?.id;
    const debutsSuivants = (this.data.creneaux ?? [])
      .filter((c) => c.jour === jour && c.id !== editedId)
      .map((c) => this.toMinutes((c.heure_debut ?? '').slice(0, 5)))
      .filter((startMin) => startMin > debut);

    return debutsSuivants.length ? Math.min(...debutsSuivants) : null;
  }

  /**
   * Durées proposées, tronquées pour ne pas déborder sur la séance suivante.
   */
  get dureesDisponibles(): { value: number; libelle: string }[] {
    const prochaine = this.prochaineSeanceMin();
    if (prochaine === null) return this.durees;

    const debut = this.toMinutes(this.form.getRawValue().heure_debut);
    const dureeMax = prochaine - debut;
    return this.durees.filter((d) => d.value <= dureeMax);
  }

  /** Ramène la durée sélectionnée à la plus grande valeur encore valide. */
  private clampDuree(): void {
    const options = this.dureesDisponibles;
    const current = this.form.get('duree')?.value;
    if (options.length && !options.some((o) => o.value === current)) {
      this.form.get('duree')?.setValue(options[options.length - 1].value);
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // getRawValue() pour inclure le champ « jour » même quand il est désactivé.
    const raw = this.form.getRawValue();
    const heure_fin = this.heureFin;

    // Garde-fou : ne pas déborder sur la séance suivante du même jour.
    const prochaine = this.prochaineSeanceMin();
    if (prochaine !== null && this.toMinutes(heure_fin) > prochaine) {
      this.notificationService.error(
        `La durée dépasse la séance suivante (${this.toHHMM(prochaine)}).`
      );
      return;
    }

    this.loading = true;

    const base = {
      affectation_id: raw.affectation_id,
      jour: raw.jour,
      heure_debut: raw.heure_debut,
      heure_fin,
      salle: raw.salle || null
    };

    const request$ =
      this.data.isEdit && this.data.creneau
        ? this.edtService.update(this.data.creneau.id, base)
        : this.edtService.create({ ...base, classe_id: this.data.classeId });

    request$.subscribe({
      next: (res) => {
        this.loading = false;
        this.notificationService.success(res.message);
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.loading = false;
        this.notificationService.error(
          err?.error?.message ?? "Erreur lors de l'enregistrement"
        );
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
