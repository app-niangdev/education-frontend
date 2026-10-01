import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterModule } from '@angular/router';
import { fadeInRight400ms } from '@vex/animations/fade-in-right.animation';
import { scaleIn400ms } from '@vex/animations/scale-in.animation';
import { EvaluationService } from 'src/app/auth/services/evaluation.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import {
  Evaluation,
  GradeSheet,
  NoteInput,
  NoteLigne,
  TYPES_EVALUATION
} from 'src/app/interfaces/Evaluation';

@Component({
  selector: 'vex-evaluation-notes',
  templateUrl: './evaluation-notes.component.html',
  styleUrls: ['./evaluation-notes.component.scss'],
  animations: [scaleIn400ms, fadeInRight400ms],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ]
})
export class EvaluationNotesComponent implements OnInit {
  private readonly evaluationService = inject(EvaluationService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  evaluation: Evaluation | null = null;
  lignes: NoteLigne[] = [];
  saisieFermee = false;

  loading = true;
  saving = false;

  constructor() {
    // L'évaluation est passée par le state du Router depuis la liste.
    this.evaluation =
      (this.router.getCurrentNavigation()?.extras.state?.['evaluation'] as
        | Evaluation
        | undefined) ??
      (history.state?.['evaluation'] as Evaluation | undefined) ??
      null;
  }

  ngOnInit(): void {
    if (!this.evaluation) {
      // Accès direct / rafraîchissement : pas de state, on retourne à la liste.
      this.router.navigate(['/index/teacher/evaluations']);
      return;
    }
    this.loadGradeSheet();
  }

  private loadGradeSheet(): void {
    if (!this.evaluation) return;
    this.loading = true;
    this.evaluationService.getGradeSheet(this.evaluation.id).subscribe({
      next: (sheet: GradeSheet | null) => {
        this.loading = false;
        if (!sheet) {
          this.notificationService.error('Grille de notes introuvable');
          this.router.navigate(['/index/teacher/evaluations']);
          return;
        }
        this.evaluation = sheet.evaluation;
        this.lignes = sheet.lignes;
        this.saisieFermee = sheet.saisie_fermee;
      },
      error: () => {
        this.loading = false;
        this.notificationService.error('Erreur lors du chargement de la grille');
      }
    });
  }

  typeLabel(value: string | undefined): string {
    return TYPES_EVALUATION.find((t) => t.value === value)?.label ?? (value ?? '');
  }

  matiereClasse(): string {
    const matiere = this.evaluation?.affectation?.classe_matiere?.matiere?.nom ?? '—';
    const classe = this.evaluation?.affectation?.classe_matiere?.classe?.nom ?? '—';
    return `${matiere} · ${classe}`;
  }

  /** Une note hors barème est signalée visuellement avant même l'envoi. */
  noteInvalide(ligne: NoteLigne): boolean {
    if (ligne.absent || ligne.valeur === null || ligne.valeur === undefined) return false;
    const bareme = this.evaluation?.bareme ?? 20;
    return ligne.valeur < 0 || ligne.valeur > bareme;
  }

  /** Quand on coche « absent », la note chiffrée n'a plus de sens. */
  onAbsentChange(ligne: NoteLigne): void {
    if (ligne.absent) ligne.valeur = null;
  }

  get nbSaisies(): number {
    return this.lignes.filter((l) => l.absent || l.valeur !== null).length;
  }

  get hasInvalides(): boolean {
    return this.lignes.some((l) => this.noteInvalide(l));
  }

  get canSave(): boolean {
    return !this.saving && !this.saisieFermee && !this.hasInvalides && this.lignes.length > 0;
  }

  save(): void {
    if (!this.evaluation || !this.canSave) return;

    // On n'envoie que les lignes réellement renseignées (note ou absence).
    const notes: NoteInput[] = this.lignes
      .filter((l) => l.absent || l.valeur !== null)
      .map((l) => ({
        eleve_id: l.eleve_id,
        valeur: l.absent ? null : l.valeur,
        absent: l.absent,
        appreciation: l.appreciation?.trim() || null
      }));

    if (notes.length === 0) {
      this.notificationService.warning('Aucune note à enregistrer');
      return;
    }

    this.saving = true;
    this.evaluationService.saveNotes(this.evaluation.id, notes).subscribe({
      next: (res) => {
        this.saving = false;
        this.notificationService.success(res.message);
        // La réponse renvoie la grille rafraîchie.
        if (res.payload) {
          this.lignes = res.payload.lignes;
          this.saisieFermee = res.payload.saisie_fermee;
        }
      },
      error: (err) => {
        this.saving = false;
        this.notificationService.error(
          err?.error?.message ?? "Erreur lors de l'enregistrement des notes"
        );
      }
    });
  }

  retour(): void {
    this.router.navigate(['/index/teacher/evaluations']);
  }
}
