import { CommonModule, Location } from '@angular/common';
import { Component, HostListener, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { fadeInRight400ms } from '@vex/animations/fade-in-right.animation';
import { scaleIn400ms } from '@vex/animations/scale-in.animation';
import { stagger40ms } from '@vex/animations/stagger.animation';
import { EmploiDuTempsService } from 'src/app/auth/services/emploi-du-temps.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import {
  ConfirmationDialogData,
  ConfirmatiomModalComponent
} from 'src/app/features/confirmatiom-modal/confirmatiom-modal.component';
import { Classe } from 'src/app/interfaces/Classe';
import {
  EmploiDuTemps,
  JOURS_SEMAINE,
  JourSemaine
} from 'src/app/interfaces/EmploiDuTemps';
import {
  lireClasseDepuisState,
  ROUTE_CLASSES
} from '../classroom/classe-navigation';
import { EmploiDuTempsDialogComponent } from './emploi-du-temps-dialog/emploi-du-temps-dialog.component';

interface JourGroupe {
  value: JourSemaine;
  libelle: string;
  creneaux: EmploiDuTemps[];
}

/** Une plage horaire de la grille (ligne). */
interface Slot {
  debut: string; // 'HH:MM'
  fin: string; // 'HH:MM'
}

/** Une cellule de la grille (case d'un jour sur une plage). */
interface GridCell {
  jour: JourSemaine;
  type: 'vide' | 'cours' | 'couvert';
  creneau?: EmploiDuTemps;
  rowspan: number;
}

interface GridRow {
  slot: Slot;
  cells: GridCell[]; // cellules à rendre (les 'couvert' sont exclues)
}

/**
 * Emploi du temps d'une classe : grille hebdomadaire des creneaux, edition,
 * et export PDF. La classe arrive par le state du Router (ou est rechargee
 * depuis l'id d'URL au rafraichissement).
 */
@Component({
  selector: 'vex-emploi-du-temps',
  templateUrl: './emploi-du-temps.component.html',
  styleUrls: ['./emploi-du-temps.component.scss'],
  animations: [stagger40ms, scaleIn400ms, fadeInRight400ms],
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatDialogModule
  ]
})
export class EmploiDuTempsComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly edtService = inject(EmploiDuTempsService);
  private readonly notificationService = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  readonly jours = JOURS_SEMAINE;

  /**
   * Lu des le constructeur : getCurrentNavigation() n'est renseigne que
   * pendant la navigation et vaut deja null dans ngOnInit.
   */
  private readonly classeFromState = lireClasseDepuisState(this.router);

  classe?: Classe;
  creneaux: EmploiDuTemps[] = [];
  /** Recalcule une seule fois par chargement (pas a chaque detection). */
  joursGroupes: JourGroupe[] = [];
  loading = false;
  downloading = false;

  /**
   * Vue active : grille (saisie rapide) ou liste. La grille hebdomadaire est
   * illisible sur un téléphone : on démarre en liste sous 640 px.
   */
  vue: 'grille' | 'liste' = this.estMobile() ? 'liste' : 'grille';

  /** La grille hebdomadaire n'est pas proposée sous 640 px. */
  private estMobile(): boolean {
    return typeof window !== 'undefined' && window.innerWidth < 640;
  }

  /** Si l'écran repasse en mobile, on rebascule sur la liste. */
  @HostListener('window:resize')
  onResize(): void {
    if (this.estMobile() && this.vue === 'grille') {
      this.vue = 'liste';
    }
  }

  /**
   * Plages de la grille : repères 08:00→18:00 (1h le matin, 30 min l'après-midi)
   * AUXQUELS on ajoute les bornes réelles des cours. Recalculées à chaque
   * chargement : sans les vraies bornes, un cours à 11:15 déborderait sur la
   * tranche suivante et décalerait les colonnes.
   */
  slots: Slot[] = [];
  /** Grille calculée une fois par chargement. */
  grille: GridRow[] = [];

  ngOnInit(): void {
    // Sans state (URL saisie/collee directement), la classe n'est pas
    // identifiable. Un rafraichissement conserve le state (history.state).
    if (!this.classeFromState) {
      this.notificationService.info(
        'Sélectionnez une classe dans la liste pour afficher son emploi du temps.'
      );
      this.router.navigate([ROUTE_CLASSES(this.router)]);
      return;
    }

    this.classe = this.classeFromState;
    this.loadData();
  }

  loadData(): void {
    if (!this.classe) return;
    this.loading = true;
    this.edtService.getByClasse(this.classe.id).subscribe({
      next: (data) => {
        this.creneaux = data;
        this.joursGroupes = this.grouperParJour(data);
        this.slots = this.construireSlots(data);
        this.grille = this.construireGrille(data);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.notificationService.error(
          "Erreur lors du chargement de l'emploi du temps"
        );
      }
    });
  }

  /**
   * Construit les plages de la grille.
   *
   * On part de repères de lecture (1h de 08:00 à 12:00, puis 30 min jusqu'à
   * 18:00) auxquels on ajoute les heures de début et de fin réelles de chaque
   * cours. Ainsi une plage ne commence et ne se termine jamais au milieu d'un
   * cours : chaque créneau s'aligne exactement sur des lignes, sans déborder ni
   * décaler les colonnes voisines.
   */
  private construireSlots(creneaux: EmploiDuTemps[]): Slot[] {
    const debutJournee = 8 * 60; // 08:00
    const bascule = 12 * 60; // 12:00 : passage au pas de 30 min
    const finJournee = 18 * 60; // 18:00

    const reperes = new Set<number>();

    // Repères réguliers pour la lisibilité.
    let t = debutJournee;
    while (t <= finJournee) {
      reperes.add(t);
      t += t < bascule ? 60 : 30;
    }

    // Bornes réelles des cours (dans la plage affichée).
    for (const c of creneaux) {
      const debut = this.toMinutes(this.heure(c.heure_debut));
      const fin = this.toMinutes(this.heure(c.heure_fin));
      if (debut > debutJournee && debut < finJournee) reperes.add(debut);
      if (fin > debutJournee && fin < finJournee) reperes.add(fin);
    }

    const tri = [...reperes]
      .filter((m) => m >= debutJournee && m <= finJournee)
      .sort((a, b) => a - b);

    const slots: Slot[] = [];
    for (let i = 0; i < tri.length - 1; i++) {
      slots.push({ debut: this.toHHMM(tri[i]), fin: this.toHHMM(tri[i + 1]) });
    }
    return slots;
  }

  /**
   * Construit la grille (jours × plages). Chaque créneau devient un bloc qui
   * s'étend sur plusieurs plages (rowspan) ; les plages recouvertes sont
   * marquées 'couvert' et exclues du rendu.
   */
  private construireGrille(creneaux: EmploiDuTemps[]): GridRow[] {
    const nbSlots = this.slots.length;
    // occupation[jourIndex][slotIndex]
    const grid: GridCell[][] = this.jours.map((j) =>
      this.slots.map<GridCell>(() => ({
        jour: j.value,
        type: 'vide',
        rowspan: 1
      }))
    );

    for (const c of creneaux) {
      const dIdx = this.jours.findIndex((j) => j.value === c.jour);
      if (dIdx < 0) continue;

      const debut = this.toMinutes(this.heure(c.heure_debut));
      const fin = this.toMinutes(this.heure(c.heure_fin));

      // Plage de départ : celle qui contient l'heure de début.
      let startIdx = this.slots.findIndex(
        (s) => debut >= this.toMinutes(s.debut) && debut < this.toMinutes(s.fin)
      );
      // Créneau hors bornes de la grille : on l'ignore dans la grille (visible en liste).
      if (startIdx < 0) continue;

      // Dernière plage chevauchée par le créneau.
      let endIdx = startIdx;
      for (let i = startIdx; i < nbSlots; i++) {
        if (this.toMinutes(this.slots[i].debut) < fin) endIdx = i;
        else break;
      }

      grid[dIdx][startIdx] = {
        jour: c.jour,
        type: 'cours',
        creneau: c,
        rowspan: endIdx - startIdx + 1
      };
      for (let i = startIdx + 1; i <= endIdx; i++) {
        grid[dIdx][i] = { jour: c.jour, type: 'couvert', rowspan: 0 };
      }
    }

    return this.slots.map((slot, i) => ({
      slot,
      cells: this.jours
        .map((_, di) => grid[di][i])
        .filter((cell) => cell.type !== 'couvert')
    }));
  }

  private toMinutes(hhmm: string): number {
    const [h, m] = (hhmm ?? '').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  private toHHMM(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  /** Groupe les creneaux par jour, dans l'ordre de la semaine. */
  private grouperParJour(creneaux: EmploiDuTemps[]): JourGroupe[] {
    return this.jours
      .map((j) => ({
        value: j.value,
        libelle: j.libelle,
        creneaux: creneaux.filter((c) => c.jour === j.value)
      }))
      .filter((g) => g.creneaux.length > 0);
  }

  get hasCreneaux(): boolean {
    return this.creneaux.length > 0;
  }

  goBack(): void {
    this.location.back();
  }

  matiereNom(c: EmploiDuTemps): string {
    return c.affectation?.classe_matiere?.matiere?.nom ?? '—';
  }

  enseignantNom(c: EmploiDuTemps): string {
    const user = c.affectation?.enseignant?.user;
    return user ? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() : '—';
  }

  heure(h: string): string {
    // 'HH:MM:SS' -> 'HH:MM'
    return h?.slice(0, 5) ?? '';
  }

  openAdd(): void {
    if (!this.classe) return;
    this.dialog
      .open(EmploiDuTempsDialogComponent, {
        width: '560px',
        disableClose: true,
        data: {
          isEdit: false,
          classeId: this.classe.id,
          classeNom: this.classe.nom,
          creneaux: this.creneaux
        }
      })
      .afterClosed()
      .subscribe((changed) => {
        if (changed) this.loadData();
      });
  }

  /** Clic sur une case vide de la grille : ouvre le dialog pré-rempli. */
  openAddAt(jour: JourSemaine, heure_debut: string): void {
    if (!this.classe) return;
    this.dialog
      .open(EmploiDuTempsDialogComponent, {
        width: '560px',
        disableClose: true,
        data: {
          isEdit: false,
          classeId: this.classe.id,
          classeNom: this.classe.nom,
          prefill: { jour, heure_debut },
          creneaux: this.creneaux
        }
      })
      .afterClosed()
      .subscribe((changed) => {
        if (changed) this.loadData();
      });
  }

  editCreneau(c: EmploiDuTemps): void {
    if (!this.classe) return;
    this.dialog
      .open(EmploiDuTempsDialogComponent, {
        width: '560px',
        disableClose: true,
        data: {
          isEdit: true,
          classeId: this.classe.id,
          classeNom: this.classe.nom,
          creneau: c,
          creneaux: this.creneaux
        }
      })
      .afterClosed()
      .subscribe((changed) => {
        if (changed) this.loadData();
      });
  }

  deleteCreneau(c: EmploiDuTemps): void {
    const data: ConfirmationDialogData = {
      title: 'Supprimer le créneau',
      message: `Supprimer « ${this.matiereNom(c)} » le ${
        this.jours.find((j) => j.value === c.jour)?.libelle
      } (${this.heure(c.heure_debut)} - ${this.heure(c.heure_fin)}) ?`,
      confirmLabel: 'Supprimer',
      destructive: true
    };

    this.dialog
      .open(ConfirmatiomModalComponent, { width: '440px', data })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.edtService.delete(c.id).subscribe({
          next: (res) => {
            this.notificationService.success(res.message);
            this.loadData();
          },
          error: (err) =>
            this.notificationService.error(
              err?.error?.message ?? 'Erreur lors de la suppression'
            )
        });
      });
  }

  downloadPdf(): void {
    if (!this.classe || this.downloading) return;
    this.downloading = true;
    this.edtService.downloadPdf(this.classe.id).subscribe({
      next: (blob) => {
        this.downloading = false;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `emploi-du-temps-${this.classe?.nom ?? 'classe'}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.downloading = false;
        this.notificationService.error('Erreur lors de la génération du PDF');
      }
    });
  }
}
