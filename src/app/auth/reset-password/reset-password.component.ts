import { NgIf } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { fadeInUp400ms } from '@vex/animations/fade-in-up.animation';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/Notification.service';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpErrorResponse } from '@angular/common/http';
import { EtablissementLogoComponent } from '../shared/etablissement-logo/etablissement-logo.component';

/**
 * Choix d'un nouveau mot de passe depuis le lien reçu par e-mail.
 *
 * Le jeton et l'adresse viennent tous deux de l'URL : l'utilisateur ne ressaisit
 * pas son e-mail, une faute de frappe ferait échouer la réinitialisation sans
 * qu'il puisse comprendre pourquoi.
 *
 * Les règles de robustesse reproduisent celles du serveur — 8 caractères, une
 * lettre, un chiffre — pour signaler le problème avant l'aller-retour. C'est le
 * serveur qui tranche : ces contrôles ne font qu'éviter un refus prévisible.
 */
@Component({
  selector: 'vex-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss'],
  animations: [fadeInUp400ms],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTooltipModule,
    NgIf,
    MatButtonModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    RouterLink,
    EtablissementLogoComponent
  ]
})
export class ResetPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notif = inject(NotificationService);
  private readonly cd = inject(ChangeDetectorRef);

  resetForm: FormGroup;
  token = '';
  email = '';

  /**
   * Le lien vient d'un compte qu'on ouvre, non d'un mot de passe oublié.
   *
   * Le mécanisme est le même — un jeton à usage unique contre un mot de passe
   * choisi — mais le discours ne peut pas l'être : parler de « réinitialiser »
   * à quelqu'un qui n'a jamais eu de mot de passe ne correspond à rien pour
   * lui, et l'invitation à « demander un nouveau lien » l'enverrait vers un
   * formulaire d'oubli qui ne le concerne pas.
   */
  activation = false;

  inputType = 'password';
  visible = false;
  isSubmitting = false;
  errorMessage = '';

  /** Le lien est mort : seul un nouveau départ a du sens. */
  lienInvalide = false;

  constructor() {
    this.resetForm = this.fb.group(
      {
        password: [
          '',
          [
            Validators.required,
            Validators.minLength(8),
            // Mêmes exigences que Password::min(8)->letters()->numbers().
            Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/)
          ]
        ],
        password_confirmation: ['', Validators.required]
      },
      { validators: [this.passwordMatchValidator] }
    );

    this.token = this.route.snapshot.queryParams['token'] ?? '';
    this.email = this.route.snapshot.queryParams['email'] ?? '';
    this.activation = this.route.snapshot.queryParams['activation'] === '1';

    // Sans jeton ni adresse, il n'y a rien à réinitialiser. On l'annonce ici
    // plutôt que de laisser remplir un formulaire voué à être refusé.
    if (!this.token || !this.email) {
      this.lienInvalide = true;
      this.errorMessage = this.activation
        ? "Ce lien d'activation est incomplet ou a été altéré. Demandez à l'administration de vous en renvoyer un."
        : 'Ce lien est incomplet ou a été altéré. Demandez une nouvelle réinitialisation.';
    }
  }

  private passwordMatchValidator(
    group: AbstractControl
  ): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirmation = group.get('password_confirmation')?.value;

    return password === confirmation ? null : { passwordMismatch: true };
  }

  onSubmit(): void {
    if (this.resetForm.invalid || this.isSubmitting || this.lienInvalide) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    this.authService
      .resetPassword({
        token: this.token,
        email: this.email,
        password: this.resetForm.value.password,
        password_confirmation: this.resetForm.value.password_confirmation
      })
      .subscribe({
        next: (reponse) => {
          this.isSubmitting = false;
          this.notif.success(
            this.activation
              ? 'Votre compte est activé. Vous pouvez maintenant vous connecter.'
              : reponse.message
          );
          this.router.navigate(['/login']);
        },
        error: (erreur: HttpErrorResponse) => {
          this.isSubmitting = false;
          this.traiterErreur(erreur);
          this.cd.markForCheck();
        }
      });
  }

  /**
   * Un jeton mort ou périmé ne se rattrape pas en réessayant : on ferme le
   * formulaire et on oriente vers une nouvelle demande.
   */
  private traiterErreur(erreur: HttpErrorResponse): void {
    const corps = erreur.error as
      | { code?: string; message?: string; errors?: Record<string, string[]> }
      | null;

    if (
      corps?.code === 'RESET_TOKEN_EXPIRED' ||
      corps?.code === 'RESET_TOKEN_INVALID'
    ) {
      this.lienInvalide = true;
      // Un lien d'activation mort ne se rattrape pas depuis « mot de passe
      // oublié » : ce formulaire exige un compte déjà ouvert. Seule
      // l'administration peut en renvoyer un.
      this.errorMessage = this.activation
        ? "Ce lien d'activation n'est plus valide. Demandez à l'administration de vous en renvoyer un."
        : corps.message ?? "Ce lien n'est plus valide.";
      this.notif.error(this.errorMessage);
      return;
    }

    // Erreurs de validation : on remonte le premier message du serveur, plus
    // précis que le nôtre (règles de robustesse, confirmation…).
    const premiereErreur = corps?.errors
      ? Object.values(corps.errors)[0]?.[0]
      : undefined;

    this.errorMessage =
      premiereErreur ?? corps?.message ?? 'La réinitialisation a échoué.';
    this.notif.error(this.errorMessage);
  }

  toggleVisibility(): void {
    this.visible = !this.visible;
    this.inputType = this.visible ? 'text' : 'password';
    this.cd.markForCheck();
  }
}
