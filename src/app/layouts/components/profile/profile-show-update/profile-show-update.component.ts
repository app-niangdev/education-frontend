import { NgIf } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { fadeInRight400ms } from '@vex/animations/fade-in-right.animation';
import { fadeInUp400ms } from '@vex/animations/fade-in-up.animation';
import { scaleIn400ms } from '@vex/animations/scale-in.animation';
import { stagger40ms } from '@vex/animations/stagger.animation';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/auth/services/auth.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import { UserFromToken } from 'src/app/interfaces/Auth';
import { UploadFileComponent } from '../../upload-file/upload-file.component';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  manager: 'Directeur',
  supervisor: 'Surveillant',
  treasurer: 'Trésorier',
  teacher: 'Enseignant'
};

const CONTRAT_LABELS: Record<string, string> = {
  permanent: 'Permanent',
  vacataire: 'Vacataire',
  stagiaire: 'Stagiaire'
};

@Component({
  selector: 'vex-profile-show-update',
  templateUrl: './profile-show-update.component.html',
  styleUrls: ['./profile-show-update.component.scss'],
  standalone: true,
  imports: [NgIf, MatIconModule, MatButtonModule, MatTooltipModule, ReactiveFormsModule, UploadFileComponent],
  animations: [fadeInUp400ms, fadeInRight400ms, scaleIn400ms, stagger40ms]
})
export class ProfileShowUpdateComponent implements OnInit, OnDestroy {
  userConnect: UserFromToken | null = null;
  isEditMode = false;
  form!: FormGroup;
  isSubmitting = false;

  /** Photo choisie mais pas encore envoyée. */
  private nouvellePhoto: File | null = null;
  /** L'utilisateur a retiré sa photo actuelle sans en déposer d'autre. */
  private photoRetiree = false;

  private sub?: Subscription;

  constructor(
    private authService: AuthService,
    private fb: FormBuilder,
    private notif: NotificationService
  ) {}

  ngOnInit(): void {
    this.sub = this.authService.user$.subscribe((u) => {
      this.userConnect = u;

      // Le formulaire suit l'utilisateur tant qu'il n'est pas ouvert : sans
      // cela, l'arrivée de `me` après le premier rendu laisserait des champs
      // remplis depuis le jeton, plus pauvre que la réponse du serveur.
      if (u && !this.isEditMode) {
        this.buildForm(u);
      }
    });
    this.authService.getMe().subscribe({ error: () => {} });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  get roleLabel(): string {
    return ROLE_LABELS[this.userConnect?.role ?? ''] ?? this.userConnect?.role ?? '';
  }

  get isStaff(): boolean {
    return ['teacher', 'supervisor', 'treasurer'].includes(this.userConnect?.role ?? '');
  }

  get isTeacher(): boolean { return this.userConnect?.role === 'teacher'; }

  /** Matières de spécialité de l'enseignant, en une ligne lisible. */
  get specialitesLabel(): string {
    return (this.userConnect?.profil?.matieres ?? [])
      .map((m) => m.nom)
      .join(', ');
  }
  get isSupervisor(): boolean { return this.userConnect?.role === 'supervisor'; }
  get isTreasurer(): boolean { return this.userConnect?.role === 'treasurer'; }

  translateContrat(value: string | null | undefined): string {
    return CONTRAT_LABELS[value ?? ''] ?? value ?? '—';
  }

  /**
   * Rien à enregistrer tant qu'aucun champ n'a bougé et qu'aucune photo n'a
   * été touchée : le bouton reste alors inerte, plutôt que d'envoyer une
   * requête qui ne changerait rien.
   */
  get rienAEnregistrer(): boolean {
    return !this.form?.dirty && !this.nouvellePhoto && !this.photoRetiree;
  }

  ouvrirEdition(): void {
    if (this.userConnect) {
      this.buildForm(this.userConnect);
    }
    this.reinitialiserPhoto();
    this.isEditMode = true;
  }

  annuler(): void {
    // On repart de l'utilisateur en base : les saisies abandonnées ne doivent
    // pas réapparaître à la prochaine ouverture du formulaire.
    if (this.userConnect) {
      this.buildForm(this.userConnect);
    }
    this.reinitialiserPhoto();
    this.isEditMode = false;
  }

  private buildForm(u: UserFromToken): void {
    this.form = this.fb.group({
      first_name: [u.first_name ?? '', [Validators.required, Validators.maxLength(100)]],
      last_name: [u.last_name ?? '', [Validators.required, Validators.maxLength(100)]],
      phone_number_one: [u.phone_number_one ?? '', [Validators.required, Validators.minLength(9), Validators.maxLength(20)]],
      phone_number_two: [u.phone_number_two ?? '', [Validators.minLength(9), Validators.maxLength(20)]],
      address: [u.address ?? '', [Validators.maxLength(255)]]
    });
  }

  private reinitialiserPhoto(): void {
    this.nouvellePhoto = null;
    this.photoRetiree = false;
  }

  onFileUpload(file: File): void {
    this.nouvellePhoto = file;
    this.photoRetiree = false;
  }

  /**
   * Le composant d'upload émet ce retrait aussi bien pour annuler une photo
   * fraîchement choisie que pour effacer celle du compte. Seul le second cas
   * doit remonter au serveur : sans photo existante, il n'y a rien à supprimer.
   */
  onFileRemove(): void {
    const avaitUnePhoto = !!this.userConnect?.image_url;
    this.photoRetiree = avaitUnePhoto && !this.nouvellePhoto;
    this.nouvellePhoto = null;
  }

  save(): void {
    if (!this.form || !this.userConnect || this.isSubmitting) return;

    if (this.form.invalid) {
      // Sans cela, un champ jamais visité n'affiche pas son erreur et le
      // bouton semble sans effet.
      this.form.markAllAsTouched();
      return;
    }

    if (this.rienAEnregistrer) {
      this.isEditMode = false;
      return;
    }

    this.isSubmitting = true;

    this.authService
      .updateProfil({
        first_name: this.form.value.first_name,
        last_name: this.form.value.last_name,
        phone_number_one: this.form.value.phone_number_one,
        phone_number_two: this.form.value.phone_number_two,
        address: this.form.value.address,
        photo: this.nouvellePhoto,
        supprimer_photo: this.photoRetiree
      })
      .subscribe({
        next: () => {
          // `user$` a déjà reçu le profil frais : la fiche, la barre latérale
          // et l'en-tête sont à jour sans recharger la page.
          this.isSubmitting = false;
          this.reinitialiserPhoto();
          this.isEditMode = false;
          this.notif.success('Vos informations ont été mises à jour.');
        },
        error: (err) => {
          this.isSubmitting = false;
          this.appliquerErreursServeur(err);
        }
      });
  }

  /**
   * Reporte un refus de validation (422) sur les champs concernés, pour que le
   * message s'affiche là où la correction doit se faire — le numéro déjà pris
   * par un autre compte en est le cas courant.
   */
  private appliquerErreursServeur(err: any): void {
    const erreurs: Record<string, string[]> | undefined = err?.error?.errors;

    if (err?.status === 422 && erreurs) {
      Object.entries(erreurs).forEach(([champ, messages]) => {
        this.form.get(champ)?.setErrors({ serveur: messages[0] });
        this.form.get(champ)?.markAsTouched();
      });

      this.notif.error(Object.values(erreurs)[0]?.[0] ?? 'Vérifiez les champs saisis.');
      return;
    }

    this.notif.error(
      err?.error?.message ?? "La mise à jour n'a pas pu être enregistrée."
    );
  }
}
