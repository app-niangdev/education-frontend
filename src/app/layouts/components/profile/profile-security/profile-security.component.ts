import { NgFor, NgIf } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { fadeInRight400ms } from '@vex/animations/fade-in-right.animation';
import { fadeInUp400ms } from '@vex/animations/fade-in-up.animation';
import { scaleIn400ms } from '@vex/animations/scale-in.animation';
import { stagger40ms, stagger60ms } from '@vex/animations/stagger.animation';
import { AuthService } from 'src/app/auth/services/auth.service';
import { NotificationService } from 'src/app/auth/services/Notification.service';
import { User } from 'src/app/interfaces/User';

@Component({
  selector: 'vex-profile-security',
  templateUrl: './profile-security.component.html',
  styleUrls: ['./profile-security.component.scss'],
  animations: [stagger60ms, fadeInUp400ms],
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    MatTooltipModule,
    NgIf,
    FormsModule,
    ReactiveFormsModule
  ]
})
export class ProfileSecurityComponent implements OnInit {
  inputType = 'password';
  visible = false;
  passwordForm: FormGroup;
  user: User | null = null;
  isSubmitting: boolean = false;

  // ─── Double authentification ───────────────────────────────────────────────

  /** État affiché par l'interrupteur. */
  twoFactorEnabled = false;
  /** Le mot de passe est redemandé : sans lui, le serveur refuse. */
  twoFactorPassword = '';
  /** L'interrupteur a été basculé, la confirmation reste à donner. */
  twoFactorPending = false;
  twoFactorSubmitting = false;
  twoFactorError = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private cd: ChangeDetectorRef,
    private notif: NotificationService
  ) {
    this.passwordForm = this.fb.group(
      {
        current_password: [
          '',
          [
            Validators.required,
            Validators.maxLength(8),
            Validators.minLength(8)
          ]
        ],
        new_password: [
          '',
          [
            Validators.required,
            Validators.minLength(8),
            Validators.maxLength(8)
          ]
        ],
        new_password_confirmation: [
          '',
          [
            Validators.required,
            Validators.minLength(8),
            Validators.maxLength(8)
          ]
        ]
      },
      {
        validators: [this.passwordMatchValidator]
      }
    );

    // authService.getCurrentUser().subscribe({
    //   next:(response)=>{
    //     this.user = response
    //   }
    // })
  }

  ngOnInit(): void {
    // L'état affiché vient du serveur : le jeton, émis avant tout changement,
    // ne le porte pas.
    this.authService.getMe().subscribe({
      next: (user) => {
        this.twoFactorEnabled = user.two_factor_enabled ?? false;
        this.cd.markForCheck();
      },
      error: () => {}
    });
  }

  // ─── Double authentification ───────────────────────────────────────────────

  /**
   * Bascule l'interrupteur sans rien envoyer : la demande n'est transmise
   * qu'une fois le mot de passe saisi et confirmée.
   */
  onTwoFactorToggle(coche: boolean): void {
    this.twoFactorEnabled = coche;
    this.twoFactorPending = true;
    this.twoFactorError = '';
    this.twoFactorPassword = '';
    this.cd.markForCheck();
  }

  confirmTwoFactor(): void {
    if (!this.twoFactorPassword || this.twoFactorSubmitting) return;

    this.twoFactorSubmitting = true;
    this.twoFactorError = '';

    this.authService
      .toggleTwoFactor(this.twoFactorEnabled, this.twoFactorPassword)
      .subscribe({
        next: (reponse) => {
          this.twoFactorSubmitting = false;
          this.twoFactorPending = false;
          this.twoFactorPassword = '';
          this.notif.success(reponse.message);
          this.cd.markForCheck();
        },
        error: (erreur: HttpErrorResponse) => {
          this.twoFactorSubmitting = false;
          // Le refus laisse l'état serveur intact : on remet l'interrupteur
          // dans sa position d'origine plutôt que d'afficher un état faux.
          this.twoFactorEnabled = !this.twoFactorEnabled;
          this.twoFactorError =
            erreur.error?.message ?? 'La modification a échoué.';
          this.notif.error(this.twoFactorError);
          this.cd.markForCheck();
        }
      });
  }

  cancelTwoFactor(): void {
    this.twoFactorEnabled = !this.twoFactorEnabled;
    this.twoFactorPending = false;
    this.twoFactorPassword = '';
    this.twoFactorError = '';
    this.cd.markForCheck();
  }

  passwordMatchValidator: ValidatorFn = (
    form: AbstractControl
  ): ValidationErrors | null => {
    const newPassword = form.get('new_password')?.value;
    const confirmPassword = form.get('new_password_confirmation')?.value;

    return newPassword !== confirmPassword ? { passwordMismatch: true } : null;
  };

  changePassword() {
    // if (this.passwordForm.valid && this.user?.id) {
    //   this.authService.changePassword(this.user.id, this.passwordForm.value).subscribe({
    //     next:(response)=>{
    //       this.notif.success(response.message);
    //       this.authService.logout().subscribe({
    //         next: () => {
    //           this.router.navigate(['/login']);
    //         },
    //         error: (logoutError) => {
    //           this.router.navigate(['/login']);
    //         }
    //       });
    //     },
    //     error:(error)=>{
    //       if (error.error.error) {
    //         this.notif.error(error.error.message);
    //       }
    //       this.notif.error(error.error.ErrorList.new_password[0]);
    //     }
    //   })
    // }
  }
  togglePassword() {
    if (this.visible) {
      this.inputType = 'password';
      this.visible = false;
      this.cd.markForCheck();
    } else {
      this.inputType = 'text';
      this.visible = true;
      this.cd.markForCheck();
    }
  }
}
