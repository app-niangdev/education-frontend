import { NgFor, NgIf } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AuthService } from 'src/app/auth/services/auth.service';
import { ConversationService } from 'src/app/auth/services/conversation.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import {
  ConversationEleve,
  ConversationReferentiels,
  OptionReferentiel,
  ServiceDestinataire
} from 'src/app/interfaces/Conversation';

/**
 * Ouverture d'un nouveau fil.
 *
 * Les services proposés viennent du backend (`/conversations/referentiels`),
 * qui les adapte au rôle : un tuteur n'y voit que la scolarité et la
 * trésorerie. La direction est absente de la liste par construction — elle ne
 * se saisit pas, elle se remonte par escalade. Ne pas réintroduire cette
 * option ici : le serveur la refuserait par un 422.
 */
@Component({
  selector: 'vex-nouvelle-conversation',
  standalone: true,
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    NgFor,
    NgIf,
    ReactiveFormsModule
  ],
  template: `
    <h2 class="flex items-center gap-2" mat-dialog-title>
      <mat-icon svgIcon="mat:forum"></mat-icon>
      <span>{{ estTuteur ? 'Nouvelle demande' : 'Nouveau fil' }}</span>
    </h2>

    <mat-dialog-content>
      <form [formGroup]="form" class="flex flex-col gap-1 pt-2">
        <mat-form-field appearance="outline">
          <mat-label>Service concerné</mat-label>
          <mat-select formControlName="service">
            <mat-option *ngFor="let s of services()" [value]="s.valeur">
              {{ s.libelle }}
            </mat-option>
          </mat-select>
          <mat-error>Le service est obligatoire.</mat-error>
        </mat-form-field>

        <!-- Réservé aux familles : un agent ouvrant un fil devrait choisir le
             tuteur, ce que cet écran ne propose pas encore. -->
        <mat-form-field *ngIf="estTuteur && eleves().length > 0" appearance="outline">
          <mat-label>Élève concerné (facultatif)</mat-label>
          <mat-select formControlName="eleve_id">
            <mat-option [value]="null">Aucun élève en particulier</mat-option>
            <mat-option *ngFor="let e of eleves()" [value]="e.id">
              {{ e.prenom }} {{ e.nom }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Objet</mat-label>
          <input formControlName="sujet" matInput maxlength="255" />
          <mat-error>L'objet est obligatoire.</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Votre message</mat-label>
          <textarea
            formControlName="corps"
            matInput
            maxlength="5000"
            rows="5"></textarea>
          <mat-error>Le message ne peut pas être vide.</mat-error>
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">Annuler</button>
      <button
        (click)="envoyer()"
        [disabled]="form.invalid || envoiEnCours()"
        color="primary"
        mat-raised-button
        type="button">
        Envoyer
      </button>
    </mat-dialog-actions>
  `
})
export class NouvelleConversationComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly conversationService = inject(ConversationService);
  private readonly authService = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly dialogRef = inject(
    MatDialogRef<NouvelleConversationComponent>
  );

  readonly estTuteur = this.authService.getRole() === 'tuteur';
  readonly services = signal<OptionReferentiel[]>([]);
  readonly eleves = signal<ConversationEleve[]>([]);
  readonly envoiEnCours = signal(false);

  readonly form = this.fb.nonNullable.group({
    service: ['', Validators.required],
    eleve_id: [null as number | null],
    sujet: ['', [Validators.required, Validators.maxLength(255)]],
    corps: ['', [Validators.required, Validators.maxLength(5000)]]
  });

  ngOnInit(): void {
    this.conversationService
      .getReferentiels()
      .subscribe((referentiels: ConversationReferentiels | null) => {
        if (!referentiels) {
          return;
        }

        this.services.set(referentiels.services ?? []);
        this.eleves.set(referentiels.eleves ?? []);
      });
  }

  envoyer(): void {
    if (this.form.invalid || this.envoiEnCours()) {
      this.form.markAllAsTouched();
      return;
    }

    this.envoiEnCours.set(true);

    const valeurs = this.form.getRawValue();

    this.conversationService
      .ouvrir({
        service: valeurs.service as ServiceDestinataire,
        eleve_id: valeurs.eleve_id,
        sujet: valeurs.sujet.trim(),
        corps: valeurs.corps.trim()
      })
      .subscribe({
        next: (conversation) => {
          this.envoiEnCours.set(false);
          this.notification.success('Votre demande a été transmise.');
          this.dialogRef.close(conversation);
        },
        error: (erreur) => {
          this.envoiEnCours.set(false);
          this.notification.error(
            erreur?.error?.message ?? "La demande n'a pas pu être envoyée."
          );
        }
      });
  }
}
