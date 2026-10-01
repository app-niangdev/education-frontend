import { NgFor, NgIf } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChildren,
  inject
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { fadeInUp400ms } from '@vex/animations/fade-in-up.animation';
import { AuthErrorBody, OtpChallengeData } from 'src/app/interfaces/Auth';
import { EtablissementLogoComponent } from '../shared/etablissement-logo/etablissement-logo.component';
import { NotificationService } from '../services/Notification.service';
import { OtpStateService } from '../services/OtpState.service';
import { AuthService } from '../services/auth.service';
import { formatCountdown } from '../services/ip-block.service';

/**
 * L'écran de saisie du code de vérification.
 *
 * On n'y arrive que par /auth/login : sans challenge en session, il n'y a rien
 * à vérifier et l'utilisateur repart vers le formulaire de connexion.
 *
 * Rien n'est décidé ici. Les jetons ne sont délivrés que par le serveur, après
 * validation du code ; l'écran ne fait qu'acheminer la saisie et traduire les
 * réponses.
 */
@Component({
  selector: 'vex-otp',
  templateUrl: './otp.component.html',
  styleUrls: ['./otp.component.scss'],
  animations: [fadeInUp400ms],
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatButtonModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    FormsModule,
    EtablissementLogoComponent
  ]
})
export class OtpComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly otpState = inject(OtpStateService);
  private readonly notif = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly cd = inject(ChangeDetectorRef);

  @ViewChildren('otpInput') inputs!: QueryList<ElementRef<HTMLInputElement>>;

  challenge: OtpChallengeData | null = null;
  digits: string[] = ['', '', '', '', '', ''];

  isSubmitting = false;
  errorMessage = '';

  /** Secondes avant expiration du code en cours. */
  expiresIn = 0;
  /** Secondes avant qu'un renvoi soit accepté. */
  resendIn = 0;
  isResending = false;

  /** Vrai quand le code est mort : plus rien à saisir, il faut en redemander un. */
  expired = false;

  private expiryTimer?: ReturnType<typeof setInterval>;
  private resendTimer?: ReturnType<typeof setInterval>;

  /** Le délai de renvoi côté serveur ; répliqué ici pour l'affichage. */
  private readonly RESEND_COOLDOWN = 60;

  ngOnInit(): void {
    this.challenge = this.otpState.get();

    if (!this.challenge) {
      this.notif.warning('Reprenez la connexion.');
      this.router.navigate(['/login']);
      return;
    }

    this.demarrerExpiration(this.challenge.expires_in);
    this.demarrerCooldown(this.RESEND_COOLDOWN);
  }

  ngOnDestroy(): void {
    this.arreterTimers();
  }

  // ─── Libellés ──────────────────────────────────────────────────────────────

  get titre(): string {
    return this.challenge?.reason === 'IP_PREVIOUSLY_BLOCKED'
      ? 'Vérification requise'
      : 'Double authentification';
  }

  get explication(): string {
    if (this.challenge?.reason === 'IP_PREVIOUSLY_BLOCKED') {
      return (
        'Des tentatives de connexion infructueuses ont été enregistrées depuis ' +
        'votre réseau. Par précaution, confirmez cette connexion avec le code ' +
        'qui vient de vous être envoyé.'
      );
    }
    return 'Saisissez le code de vérification qui vient de vous être envoyé.';
  }

  get destinataire(): string {
    return this.challenge?.masked_email ?? 'votre adresse e-mail';
  }

  get expiresLabel(): string {
    return formatCountdown(this.expiresIn);
  }

  get code(): string {
    return this.digits.join('');
  }

  get complet(): boolean {
    return /^\d{6}$/.test(this.code);
  }

  // ─── Saisie ────────────────────────────────────────────────────────────────

  onInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const valeur = input.value.replace(/\D/g, '');

    if (!valeur) {
      this.digits[index] = '';
      input.value = '';
      return;
    }

    // Un collage remplit les cases suivantes plutôt que de tout perdre.
    if (valeur.length > 1) {
      this.repartir(valeur, index);
      return;
    }

    this.digits[index] = valeur;
    input.value = valeur;

    if (index < 5) {
      this.focus(index + 1);
    }

    // Six chiffres saisis : on valide sans attendre un clic de plus.
    if (this.complet) {
      this.verify();
    }
  }

  onKeyDown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace' && !this.digits[index] && index > 0) {
      this.focus(index - 1);
      return;
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      this.focus(index - 1);
      return;
    }
    if (event.key === 'ArrowRight' && index < 5) {
      event.preventDefault();
      this.focus(index + 1);
    }
  }

  onPaste(event: ClipboardEvent, index: number): void {
    const colle = event.clipboardData?.getData('text')?.replace(/\D/g, '');
    if (!colle) return;

    event.preventDefault();
    this.repartir(colle, index);
  }

  // ─── Actions ───────────────────────────────────────────────────────────────

  verify(): void {
    if (!this.challenge || !this.complet || this.isSubmitting || this.expired) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    this.auth.verifyOtp(this.challenge.challenge_token, this.code).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.otpState.clear();
        this.arreterTimers();
        this.notif.success('Connexion réussie.');
        // La navigation est conduite par AuthService.navigateByRole().
      },
      error: (erreur: HttpErrorResponse) => {
        this.isSubmitting = false;
        this.traiterErreur(erreur);
        this.cd.markForCheck();
      }
    });
  }

  resend(event?: Event): void {
    event?.preventDefault();

    if (!this.challenge || this.resendIn > 0 || this.isResending) return;

    this.isResending = true;
    this.errorMessage = '';

    this.auth.resendOtp(this.challenge.challenge_token).subscribe({
      next: (reponse) => {
        this.isResending = false;
        this.vider();
        this.expired = false;
        this.demarrerExpiration(reponse.expires_in);
        this.demarrerCooldown(this.RESEND_COOLDOWN);
        this.notif.success(reponse.message ?? 'Un nouveau code vous a été envoyé.');
        this.cd.markForCheck();
      },
      error: (erreur: HttpErrorResponse) => {
        this.isResending = false;
        this.traiterErreur(erreur);
        this.cd.markForCheck();
      }
    });
  }

  /** Abandonne la vérification et repart du formulaire de connexion. */
  annuler(): void {
    this.otpState.clear();
    this.arreterTimers();
    this.router.navigate(['/login']);
  }

  // ─── Interne ───────────────────────────────────────────────────────────────

  /**
   * Traduit un refus du serveur.
   *
   * Trois d'entre eux sont définitifs : le challenge n'existe plus, ou il est
   * saturé. Insister n'aurait aucun effet, on renvoie donc au login plutôt que
   * de laisser saisir un code que rien n'acceptera.
   */
  private traiterErreur(erreur: HttpErrorResponse): void {
    const corps = erreur.error as AuthErrorBody | null;

    switch (corps?.code) {
      case 'INVALID_CHALLENGE':
      case 'OTP_TOO_MANY_ATTEMPTS':
        this.notif.error(corps.message);
        this.annuler();
        return;

      case 'OTP_EXPIRED':
        // Un code périmé se remplace : le challenge, lui, peut encore vivre.
        this.expired = true;
        this.expiresIn = 0;
        this.resendIn = 0;
        this.vider();
        this.errorMessage = 'Le code a expiré. Demandez un nouveau code.';
        return;

      case 'OTP_RESEND_LIMIT':
        this.notif.error(corps.message);
        this.annuler();
        return;

      case 'OTP_RESEND_COOLDOWN':
        this.demarrerCooldown(corps.retry_after ?? this.RESEND_COOLDOWN);
        this.errorMessage = corps.message;
        return;

      case 'IP_BLOCKED':
        // Le décompte est déjà porté par l'écran de connexion.
        this.otpState.clear();
        this.arreterTimers();
        this.router.navigate(['/login']);
        return;

      case 'INVALID_OTP': {
        const restants = corps.attempts_left;
        this.errorMessage =
          restants && restants > 0
            ? `Code incorrect. ${restants} essai${restants > 1 ? 's' : ''} restant${restants > 1 ? 's' : ''}.`
            : 'Code incorrect.';
        this.vider();
        return;
      }

      default:
        this.errorMessage =
          corps?.message ?? 'La vérification a échoué. Réessayez.';
    }
  }

  private repartir(chiffres: string, depuis: number): void {
    const morceaux = chiffres.slice(0, 6 - depuis).split('');

    morceaux.forEach((c, i) => {
      this.digits[depuis + i] = c;
      const champ = this.inputs?.get(depuis + i);
      if (champ) champ.nativeElement.value = c;
    });

    this.focus(Math.min(depuis + morceaux.length, 5));

    if (this.complet) {
      this.verify();
    }
  }

  private vider(): void {
    this.digits = ['', '', '', '', '', ''];
    this.inputs?.forEach((champ) => (champ.nativeElement.value = ''));
    this.focus(0);
  }

  private focus(index: number): void {
    this.inputs?.get(index)?.nativeElement.focus();
  }

  private demarrerExpiration(secondes: number): void {
    if (this.expiryTimer) clearInterval(this.expiryTimer);

    this.expiresIn = Math.max(0, Math.floor(secondes));

    this.expiryTimer = setInterval(() => {
      this.expiresIn -= 1;

      if (this.expiresIn <= 0) {
        this.expiresIn = 0;
        clearInterval(this.expiryTimer);
        this.expiryTimer = undefined;
        // Le code affiché ne vaut plus rien : on ferme la saisie plutôt que de
        // laisser envoyer un code que le serveur rejettera de toute façon.
        this.expired = true;
        this.resendIn = 0;
      }

      this.cd.markForCheck();
    }, 1000);
  }

  private demarrerCooldown(secondes: number): void {
    if (this.resendTimer) clearInterval(this.resendTimer);

    this.resendIn = Math.max(0, Math.floor(secondes));
    if (this.resendIn === 0) return;

    this.resendTimer = setInterval(() => {
      this.resendIn -= 1;

      if (this.resendIn <= 0) {
        this.resendIn = 0;
        clearInterval(this.resendTimer);
        this.resendTimer = undefined;
      }

      this.cd.markForCheck();
    }, 1000);
  }

  private arreterTimers(): void {
    if (this.expiryTimer) clearInterval(this.expiryTimer);
    if (this.resendTimer) clearInterval(this.resendTimer);
    this.expiryTimer = undefined;
    this.resendTimer = undefined;
  }
}
