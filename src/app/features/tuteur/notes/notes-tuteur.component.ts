import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { fadeInRight400ms } from '@vex/animations/fade-in-right.animation';
import { fadeInUp400ms } from '@vex/animations/fade-in-up.animation';
import { scaleIn400ms } from '@vex/animations/scale-in.animation';
import { stagger40ms } from '@vex/animations/stagger.animation';
import { NotesTuteurService } from 'src/app/auth/services/notes-tuteur.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import {
  EleveDuTuteur,
  EvaluationReleve,
  MatiereReleve,
  ReleveNotes
} from 'src/app/interfaces/NotesTuteur';

/**
 * Les résultats scolaires vus par la famille.
 *
 * Un tuteur suit souvent plusieurs enfants : le sélecteur d'élève est donc
 * toujours présent dès qu'il y en a plus d'un, et la période se choisit
 * séparément. Les moyennes affichées viennent du serveur — les recalculer ici
 * risquerait de montrer une valeur différente de celle du bulletin.
 */
@Component({
  selector: 'vex-notes-tuteur',
  templateUrl: './notes-tuteur.component.html',
  styleUrls: ['./notes-tuteur.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatExpansionModule,
    MatDividerModule,
    MatTooltipModule
  ],
  animations: [fadeInUp400ms, fadeInRight400ms, scaleIn400ms, stagger40ms]
})
export class NotesTuteurComponent implements OnInit {
  private readonly service = inject(NotesTuteurService);
  private readonly notif = inject(NotificationService);

  eleves: EleveDuTuteur[] = [];
  eleveId: number | null = null;

  releve: ReleveNotes | null = null;
  periodeId: number | null = null;

  chargementEleves = true;
  chargementReleve = false;
  erreur = '';

  ngOnInit(): void {
    this.service.mesEleves().subscribe({
      next: (eleves) => {
        this.eleves = eleves;
        this.chargementEleves = false;

        if (eleves.length) {
          this.eleveId = eleves[0].id;
          this.chargerReleve();
        }
      },
      error: () => {
        this.chargementEleves = false;
        this.erreur =
          "Les résultats n'ont pas pu être chargés. Réessayez dans un instant.";
      }
    });
  }

  /** Changement d'enfant : la période repart de celle en cours. */
  onEleveChange(): void {
    this.periodeId = null;
    this.chargerReleve();
  }

  onPeriodeChange(): void {
    this.chargerReleve();
  }

  private chargerReleve(): void {
    if (!this.eleveId) return;

    this.chargementReleve = true;
    this.erreur = '';

    this.service.releve(this.eleveId, this.periodeId).subscribe({
      next: (releve) => {
        this.releve = releve;
        // Le serveur tranche la période retenue quand on ne la précise pas :
        // on aligne le sélecteur dessus, sinon il resterait vide.
        this.periodeId = releve.periode?.id ?? null;
        this.chargementReleve = false;
      },
      error: (err) => {
        this.chargementReleve = false;
        this.releve = null;
        this.erreur =
          err?.error?.message ?? "Ce relevé n'a pas pu être chargé.";
        this.notif.error(this.erreur);
      }
    });
  }

  // ── Aides d'affichage ──────────────────────────────────────────────────

  /** Les matières où quelque chose a été noté, pour le compteur d'en-tête. */
  get nbMatieresNotees(): number {
    return (this.releve?.matieres ?? []).filter((m) => m.notee).length;
  }

  /**
   * Une note lisible : le tiret dit « rien à afficher », et se distingue d'un
   * zéro, qui est une vraie note.
   */
  afficherNote(valeur: number | null): string {
    return valeur === null || valeur === undefined
      ? '—'
      : valeur.toFixed(2).replace('.', ',');
  }

  /** Ce que porte la colonne « note » d'une évaluation. */
  noteEvaluation(evaluation: EvaluationReleve): string {
    if (evaluation.absent) return 'Absent';
    if (!evaluation.saisie) return 'Non saisie';

    return `${this.afficherNote(evaluation.valeur)} / ${evaluation.bareme}`;
  }

  /**
   * La couleur d'une moyenne, sur le seuil de 10 qui fait sens pour les
   * familles. Neutre tant que rien n'est noté : un gris ne juge pas.
   */
  classeMoyenne(moyenne: number | null): string {
    if (moyenne === null) return 'text-hint';

    if (moyenne >= 14) return 'text-green-600';
    if (moyenne >= 10) return 'text-blue-600';

    return 'text-red-600';
  }

  /** Suivi de liste : évite de reconstruire les cartes à chaque rafraîchissement. */
  suivreMatiere(_: number, matiere: MatiereReleve): string {
    return `${matiere.matiere_id ?? matiere.matiere}`;
  }

  suivreEvaluation(_: number, evaluation: EvaluationReleve): number {
    return evaluation.id;
  }
}
