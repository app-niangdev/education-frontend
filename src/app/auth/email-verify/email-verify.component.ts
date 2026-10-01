import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { fadeInUp400ms } from '@vex/animations/fade-in-up.animation';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { NgIf } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatMenuModule } from '@angular/material/menu';
import { catchError, of } from 'rxjs';
import { EmailVerifyService } from './email-verify.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'vex-email-verify',
  templateUrl: './email-verify.component.html',
  styleUrls: ['./email-verify.component.scss'],
  animations: [fadeInUp400ms],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatTooltipModule,
    NgIf,
    MatIconModule,
    MatCheckboxModule,
    FormsModule,
    MatProgressBarModule,
    MatMenuModule,
    MatProgressSpinnerModule
  ]
})
export class EmailVerifyComponent implements OnInit {
  isLoading: boolean = true;
  isVerified: boolean = false;
  error: string = '';
  successMessage: string = '';
  showEmailInput: boolean = false;
  isResending: boolean = false;
  emailControl = new FormControl('', [Validators.required, Validators.email]);

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private emailVerifyService: EmailVerifyService
  ) {}

  ngOnInit(): void {
    this.verifyEmail();
  }

  private verifyEmail(): void {
    // Récupérer les paramètres de l'URL
    const id = parseInt(this.route.snapshot.paramMap.get('id')!);
    const hash = this.route.snapshot.paramMap.get('hash');
    const expires = this.route.snapshot.queryParamMap.get('expires');
    const signature = this.route.snapshot.queryParamMap.get('signature');

    if (!id || !hash) {
      this.error = 'Lien de vérification invalide.';
      this.isLoading = false;
      return;
    }

    // Appeler le service de vérification
    this.emailVerifyService.verify(id, hash, expires, signature).subscribe({
      next: (response: any) => {
        this.handleVerificationSuccess(response);
      },
      error: (err) => {
        this.handleVerificationError(err);
      }
    });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  showEmailInputForm() {
    this.showEmailInput = true;
    this.error = '';
  }

  resendVerificationEmail() {
    if (this.emailControl.invalid) {
      this.error = 'Veuillez entrer une adresse email valide.';
      return;
    }

    this.isResending = true;
    this.error = '';
    this.successMessage = '';

    this.emailVerifyService.resendVerification(this.emailControl.value!).subscribe({
      next: (response: any) => {
        this.isResending = false;
        this.showEmailInput = false;
        this.successMessage = response.message || 'Un nouveau lien de vérification a été envoyé à votre adresse email.';
      },
      error: (err) => {
        this.isResending = false;
        this.error = err.error?.message || "Erreur lors de l'envoi du lien de vérification.";
      }
    });
  }

  private handleVerificationSuccess(response: any) {
    this.isVerified = true;
    this.isLoading = false;
    this.successMessage = response.message || 'Votre email a été vérifié avec succès !';

    // Redirection automatique après 3 secondes
    setTimeout(() => {
      this.router.navigate(['/login']);
    }, 3000);
  }

  /**
   * Gère la réponse en cas d'erreur de vérification
   * @param err - L'erreur retournée par l'API
   */
  private handleVerificationError(err: any): void {
    this.isLoading = false;
    this.isVerified = false;
    this.error = err.error?.message || "Erreur lors de la vérification de l'email.";
  }
}
