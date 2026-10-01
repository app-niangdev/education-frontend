import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { fadeInUp400ms } from '@vex/animations/fade-in-up.animation';
import { MatButtonModule } from '@angular/material/button';
import { NgIf } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/Notification.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpErrorResponse } from '@angular/common/http';
import { EtablissementLogoComponent } from '../shared/etablissement-logo/etablissement-logo.component';

/**
 * Demande d'un lien de réinitialisation.
 *
 * Le serveur répond la même chose que l'adresse existe ou non, et l'écran s'y
 * tient : afficher « aucun compte avec cette adresse » ferait de ce formulaire,
 * ouvert à tous, un annuaire du personnel de l'établissement.
 */
@Component({
  selector: 'vex-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss'],
  animations: [fadeInUp400ms],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    NgIf,
    MatButtonModule,
    MatProgressSpinnerModule,
    RouterLink,
    EtablissementLogoComponent
  ]
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly notif = inject(NotificationService);
  private readonly cd = inject(ChangeDetectorRef);

  isSubmitting = false;
  showSuccess = false;
  messageSuccess = '';
  errorMessage = '';

  form = this.fb.group({
    email: [
      '',
      [Validators.required, Validators.email, Validators.maxLength(255)]
    ]
  });

  send(): void {
    if (this.form.invalid || this.isSubmitting) return;

    this.isSubmitting = true;
    this.errorMessage = '';

    const email = this.form.value.email ?? '';

    this.authService.forgotPassword(email).subscribe({
      next: (reponse) => {
        this.isSubmitting = false;
        this.messageSuccess = reponse.message;
        this.showSuccess = true;
        this.cd.markForCheck();
      },
      error: (erreur: HttpErrorResponse) => {
        this.isSubmitting = false;
        this.traiterErreur(erreur);
        this.cd.markForCheck();
      }
    });
  }

  private traiterErreur(erreur: HttpErrorResponse): void {
    const corps = erreur.error as
      | { code?: string; message?: string; errors?: Record<string, string[]> }
      | null;

    // Un lien vient d'être envoyé et reste valable : le dire franchement évite
    // que l'utilisateur ne s'acharne alors que le message l'attend déjà.
    if (corps?.code === 'RESET_THROTTLED') {
      this.errorMessage =
        corps.message ??
        'Un lien vient déjà de vous être envoyé. Patientez avant d\'en demander un autre.';
      this.notif.warning(this.errorMessage);
      return;
    }

    const premiereErreur = corps?.errors
      ? Object.values(corps.errors)[0]?.[0]
      : undefined;

    this.errorMessage =
      premiereErreur ?? corps?.message ?? 'L\'envoi a échoué. Réessayez.';
    this.notif.error(this.errorMessage);
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
