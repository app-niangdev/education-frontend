import { NgIf } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { fadeInUp400ms } from '@vex/animations/fade-in-up.animation';
import { AuthService } from '../services/auth.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NotificationService } from '../services/Notification.service';
import { EtablissementLogoComponent } from '../shared/etablissement-logo/etablissement-logo.component';

@Component({
  selector: 'vex-change-password',
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.scss'],
  animations: [fadeInUp400ms],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    NgIf,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    EtablissementLogoComponent
  ]
})
export class ChangePasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private notificationService = inject(NotificationService);
  private cd = inject(ChangeDetectorRef);

  changePasswordForm!: FormGroup;
  /** Affichée à titre de repère, vide pour un compte sans adresse. */
  email: string = '';
  isSubmitting: boolean = false;

  inputTypeNew = 'password';
  visibleNew = false;

  inputTypeConfirm = 'password';
  visibleConfirm = false;

  ngOnInit() {
    // L'utilisateur est identifié par son jeton : l'écran s'atteint connecté,
    // juste après une connexion réussie. Il n'y a ni e-mail ni identifiant à
    // transporter en query params — un tuteur qui se connecte par téléphone
    // n'a d'ailleurs pas forcément d'adresse.
    if (!this.authService.isLoggedIn()) {
      this.notificationService.error('Veuillez vous connecter.');
      this.router.navigate(['/login']);
      return;
    }

    this.email = this.authService.getCurrentUserSync()?.email ?? '';

    this.changePasswordForm = this.fb.group(
      {
        new_password: ['', [Validators.required, Validators.minLength(8)]],
        new_password_confirmation: ['', [Validators.required]]
      },
      { validators: this.passwordMatchValidator }
    );
  }

  passwordMatchValidator(group: FormGroup) {
    const newPassword = group.get('new_password')?.value;
    const confirmPassword = group.get('new_password_confirmation')?.value;
    return newPassword === confirmPassword ? null : { passwordMismatch: true };
  }

  onSubmit() {
    if (this.changePasswordForm.valid) {
      this.isSubmitting = true;
      this.changePasswordForm.disable();

      const payload = {
        password: this.changePasswordForm.value.new_password,
        password_confirmation:
          this.changePasswordForm.value.new_password_confirmation
      };

      this.authService.changePasswordFirstLogin(payload).subscribe({
        next: (response) => {
          this.isSubmitting = false;
          this.notificationService.success(response.message);

          // La session reste valable : le jeton n'a pas changé, seul le mot de
          // passe l'a été. Renvoyer vers /login obligerait à se reconnecter
          // sans raison, avec un mot de passe tout juste choisi.
          setTimeout(() => this.authService.allerVersSonEspace(), 1200);
        },
        error: (error) => {
          console.log(error);

          this.isSubmitting = false;
          this.changePasswordForm.enable();

          const errorMessage =
            error.error?.message ||
            'Une erreur est survenue lors du changement de mot de passe';
          this.notificationService.error(errorMessage);
        }
      });
    }
  }

  toggleVisibility(field: 'new' | 'confirm') {
    switch (field) {
      case 'new':
        this.visibleNew = !this.visibleNew;
        this.inputTypeNew = this.visibleNew ? 'text' : 'password';
        break;
      case 'confirm':
        this.visibleConfirm = !this.visibleConfirm;
        this.inputTypeConfirm = this.visibleConfirm ? 'text' : 'password';
        break;
    }
    this.cd.markForCheck();
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
