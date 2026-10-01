import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { concatMap, from, reduce } from 'rxjs';

import { EleveService } from 'src/app/auth/services/eleve.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import { RapportImport } from 'src/app/interfaces/Eleve';

import {
  ErreurImport,
  genererModele,
  LigneImport,
  lireClasseur
} from './eleve-import.parser';

/**
 * Taille des lots envoyes au serveur.
 *
 * Le backend en refuse davantage (ImportElevesRequest::MAX_LIGNES) : chaque
 * ligne ouvre sa transaction et peut creer un tuteur, un lot plus gros
 * tiendrait la connexion trop longtemps. Un fichier de 2000 eleves part donc
 * en quatre envois, dont les rapports sont additionnes.
 */
const TAILLE_LOT = 500;

type Etape = 'depot' | 'apercu' | 'envoi' | 'rapport';

/**
 * Reprise de donnees : import des eleves deja scolarises depuis un tableur.
 *
 * L'ecran suit le geste de l'agent plutot que la mecanique technique : il
 * depose son fichier, voit ce qui sera importe et ce qui bloque, corrige,
 * puis lance. Rien ne part tant qu'il n'a pas vu l'apercu — c'est la seule
 * facon de ne pas decouvrir une colonne mal lue une fois les fiches en base.
 *
 * Le fichier est lu dans le navigateur (voir eleve-import.parser) ; le
 * serveur ne recoit que du JSON deja mis en forme.
 */
@Component({
  selector: 'vex-eleve-import-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule
  ],
  templateUrl: './eleve-import-dialog.component.html'
})
export class EleveImportDialogComponent {
  private readonly eleveService = inject(EleveService);
  private readonly notification = inject(NotificationService);
  private readonly dialogRef =
    inject<MatDialogRef<EleveImportDialogComponent, boolean>>(MatDialogRef);

  readonly etape = signal<Etape>('depot');

  readonly nomFichier = signal('');
  readonly lignes = signal<LigneImport[]>([]);
  readonly erreurs = signal<ErreurImport[]>([]);
  readonly colonnesIgnorees = signal<string[]>([]);
  readonly rapport = signal<RapportImport | null>(null);

  /** Progression de l'envoi, en lignes traitees. */
  readonly envoyees = signal(0);

  /** Vrai quand l'agent survole la zone de depot avec un fichier. */
  readonly survol = signal(false);

  /**
   * Les listes du rapport peuvent compter des centaines d'entrees : on n'en
   * montre qu'un extrait, l'essentiel etant les compteurs et les motifs.
   */
  readonly LIMITE_AFFICHAGE = 50;

  telechargerModele(): void {
    genererModele();
  }

  onFichierChoisi(event: Event): void {
    const input = event.target as HTMLInputElement;
    const fichier = input.files?.[0];

    // Le champ est remis a zero : sans cela, redeposer le meme fichier apres
    // correction ne declencherait aucun evenement.
    input.value = '';

    if (fichier) this.lireFichier(fichier);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.survol.set(false);

    const fichier = event.dataTransfer?.files?.[0];
    if (fichier) this.lireFichier(fichier);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.survol.set(true);
  }

  onDragLeave(): void {
    this.survol.set(false);
  }

  private lireFichier(fichier: File): void {
    if (!/\.(xlsx|xls|csv)$/i.test(fichier.name)) {
      this.notification.error(
        'Format non reconnu : déposez un fichier Excel (.xlsx, .xls) ou CSV.'
      );
      return;
    }

    const lecteur = new FileReader();

    lecteur.onload = () => {
      try {
        const resultat = lireClasseur(lecteur.result as ArrayBuffer);

        if (resultat.lignes.length === 0 && resultat.erreurs.length === 0) {
          this.notification.error(
            'Le fichier ne contient aucune ligne exploitable.'
          );
          return;
        }

        this.nomFichier.set(fichier.name);
        this.lignes.set(resultat.lignes);
        this.erreurs.set(resultat.erreurs);
        this.colonnesIgnorees.set(resultat.colonnesIgnorees);
        this.etape.set('apercu');
      } catch {
        // Fichier corrompu, protege par mot de passe, ou qui n'est pas un
        // classeur malgre son extension.
        this.notification.error(
          "Le fichier n'a pas pu être lu. Vérifiez qu'il s'agit bien d'un classeur Excel non protégé."
        );
      }
    };

    lecteur.onerror = () =>
      this.notification.error("Le fichier n'a pas pu être ouvert.");

    lecteur.readAsArrayBuffer(fichier);
  }

  /** Revient au depot pour corriger et recharger le fichier. */
  recommencer(): void {
    this.nomFichier.set('');
    this.lignes.set([]);
    this.erreurs.set([]);
    this.colonnesIgnorees.set([]);
    this.rapport.set(null);
    this.envoyees.set(0);
    this.etape.set('depot');
  }

  /**
   * Envoie les lignes valides, par lots successifs.
   *
   * `concatMap` serialise les envois : les lots partent l'un apres l'autre et
   * non en parallele. Deux lots concurrents pourraient reclamer le meme
   * matricule genere, ou creer deux fois le tuteur d'une meme fratrie.
   */
  lancerImport(): void {
    const lignes = this.lignes();

    if (lignes.length === 0) return;

    this.etape.set('envoi');
    this.envoyees.set(0);

    const lots: LigneImport[][] = [];
    for (let i = 0; i < lignes.length; i += TAILLE_LOT) {
      lots.push(lignes.slice(i, i + TAILLE_LOT));
    }

    from(lots)
      .pipe(
        concatMap((lot) => this.eleveService.importer(lot)),
        reduce(
          (cumul: RapportImport, reponse) => {
            const lot = reponse.payload;

            if (!lot) return cumul;

            this.envoyees.update(
              (n) => n + lot.crees + lot.ignores + lot.echecs
            );

            return {
              crees: cumul.crees + lot.crees,
              ignores: cumul.ignores + lot.ignores,
              echecs: cumul.echecs + lot.echecs,
              details: {
                crees: [...cumul.details.crees, ...lot.details.crees],
                ignores: [...cumul.details.ignores, ...lot.details.ignores],
                echecs: [...cumul.details.echecs, ...lot.details.echecs]
              }
            };
          },
          {
            crees: 0,
            ignores: 0,
            echecs: 0,
            details: { crees: [], ignores: [], echecs: [] }
          } as RapportImport
        )
      )
      .subscribe({
        next: (rapport) => {
          this.rapport.set(rapport);
          this.etape.set('rapport');

          if (rapport.crees > 0) {
            this.notification.success(
              `${rapport.crees} élève(s) importé(s) avec succès.`
            );
          }
        },
        error: (erreur) => {
          // Un lot refuse en bloc : la validation serveur a trouve une ligne
          // que le navigateur avait laissee passer. On revient a l'apercu,
          // le fichier reste charge.
          this.etape.set('apercu');

          this.notification.error(
            erreur?.error?.message ??
              "L'import a échoué. Aucune donnée n'a été enregistrée pour ce lot."
          );

          // Les erreurs serveur portent le numero de ligne (voir
          // ImportElevesRequest::failedValidation) : on les remonte a
          // l'ecran plutot que de les laisser dans un toast fugace.
          const messages: string[] = Object.values(
            erreur?.error?.errors ?? {}
          ).flat() as string[];

          if (messages.length > 0) {
            this.erreurs.update((actuelles) => [
              ...actuelles,
              {
                ligne: 0,
                intitule: 'Refusé par le serveur',
                messages
              }
            ]);
          }
        }
      });
  }

  /** Ferme en signalant si la liste doit etre rechargee. */
  fermer(): void {
    this.dialogRef.close((this.rapport()?.crees ?? 0) > 0);
  }

  get progression(): number {
    const total = this.lignes().length;

    return total === 0 ? 0 : Math.round((this.envoyees() / total) * 100);
  }
}
