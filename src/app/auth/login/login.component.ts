import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  inject
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoginRequest } from '../LoginRequest';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { fadeInUp400ms } from '@vex/animations/fade-in-up.animation';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { NgIf } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/Notification.service';
import { OtpStateService } from '../services/OtpState.service';
import { IpBlockService, formatCountdown } from '../services/ip-block.service';
import { HttpErrorResponse } from '@angular/common/http';
import { EtablissementLogoComponent } from '../shared/etablissement-logo/etablissement-logo.component';
import { AuthErrorBody } from 'src/app/interfaces/Auth';

@Component({
  selector: 'vex-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  animations: [fadeInUp400ms],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    NgIf,
    MatButtonModule,
    MatTooltipModule,
    MatIconModule,
    MatCheckboxModule,
    RouterLink,
    MatProgressSpinnerModule,
    EtablissementLogoComponent
  ]
})
export class LoginComponent implements OnInit {
  private authService = inject(AuthService);
  private notif = inject(NotificationService);
  private otpState = inject(OtpStateService);
  private blocage = inject(IpBlockService);
  private router = inject(Router);
  private cd = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  form!: FormGroup;
  isSubmitting = false;
  errorMessage = '';
  inputType = 'password';
  visible = false;

  /** Secondes restantes du blocage. Zéro quand l'accès est ouvert. */
  countdown = 0;
  blockMessage = '';

  ngOnInit() {
    // Un seul champ pour l'e-mail ET le téléphone : les familles se
    // connectent avec leur numéro, le personnel avec son adresse. Exiger un
    // e-mail valide, comme avant, fermait la porte aux tuteurs — beaucoup
    // n'ont pas d'adresse. Le format est deviné à l'envoi (voir `login`).
    this.form = new FormGroup({
      identifiant: new FormControl('', [Validators.required]),
      password: new FormControl('', [
        Validators.required,
        Validators.minLength(8)
      ]),
      rememberme: new FormControl(false)
    });

    // Le décompte est piloté par le service : un blocage rencontré sur un autre
    // écran est donc déjà connu en arrivant ici.
    this.blocage.state$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((etat) => {
        this.countdown = etat?.retryAfter ?? 0;
        this.blockMessage = etat?.message ?? '';
        this.cd.markForCheck();
      });
  }

  /** « 01:40 » — ce que lit l'utilisateur pendant l'attente. */
  get countdownLabel(): string {
    return formatCountdown(this.countdown);
  }

  get isBlocked(): boolean {
    return this.countdown > 0;
  }

  /**
   * Traduit le champ unique en l'identifiant attendu par le serveur.
   *
   * La distinction se fait sur la présence d'un « @ » : ce qui en contient est
   * une adresse, le reste est traité comme un numéro. Un identifiant purement
   * alphabétique (le `username` du personnel) part aussi en `username`.
   *
   * Rien n'est décidé ici : le serveur reste seul juge de l'existence du
   * compte. On lui indique seulement dans quelle colonne chercher.
   */
  private identifiants(): LoginRequest {
    const saisie: string = (this.form.value.identifiant ?? '').trim();
    const base = {
      password: this.form.value.password,
      rememberMe: this.form.value.rememberme
    };

    if (saisie.includes('@')) {
      return { ...base, email: saisie };
    }

    // Un identifiant sans chiffre ne peut pas être un numéro : c'est le
    // `username` d'un membre du personnel.
    if (!/\d/.test(saisie)) {
      return { ...base, username: saisie };
    }

    // Le serveur normalise à son tour : on lui envoie la saisie telle quelle,
    // espaces et indicatif compris.
    return { ...base, phone: saisie };
  }

  login() {
    // Le décompte n'ouvre ni ne ferme rien : il évite un aller-retour dont on
    // connaît déjà la réponse. C'est le serveur qui refuse, ici comme ailleurs.
    if (this.form.invalid || this.isBlocked) return;

    this.isSubmitting = true;
    this.errorMessage = '';

    this.authService.login(this.identifiants()).subscribe({
      next: (reponse) => {
        this.isSubmitting = false;

        if (reponse.code === 'OTP_REQUIRED') {
          // Aucune session n'existe encore : seule la référence du challenge
          // est mise de côté, le temps d'atteindre l'écran de vérification.
          this.otpState.set(reponse.data);
          this.notif.info(reponse.message ?? 'Un code de vérification a été envoyé.');
          this.router.navigate(['/otp']);
          return;
        }

        this.blocage.clear();
        // Pour LOGIN_SUCCESS, la navigation est conduite par AuthService.
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting = false;
        this.traiterErreur(error);
        this.cd.markForCheck();
      }
    });
  }

  /**
   * Traduit un refus du serveur.
   *
   * Le cas IP_BLOCKED n'est pas traité ici : l'intercepteur l'a déjà déclaré au
   * service de blocage, qui alimente le décompte affiché.
   */
  private traiterErreur(error: HttpErrorResponse): void {
    const corps = error.error as AuthErrorBody | null;

    if (corps?.code === 'IP_BLOCKED') {
      this.errorMessage = '';
      return;
    }

    if (corps?.code === 'ACCOUNT_DISABLED') {
      this.errorMessage = corps.message;
      this.notif.error(this.errorMessage);
      return;
    }

    if (corps?.code === 'INVALID_CREDENTIALS') {
      const restants = corps.attempts_left;

      // Prévenir vaut mieux que laisser le blocage tomber sans annonce : le
      // compte des essais est de toute façon déductible en les comptant.
      this.errorMessage =
        restants !== undefined && restants !== null && restants > 0 && restants <= 2
          ? `Identifiants incorrects. ${restants} tentative${restants > 1 ? 's' : ''} avant blocage temporaire.`
          : 'Identifiants incorrects.';

      this.notif.error(this.errorMessage);
      return;
    }

    this.errorMessage = corps?.message ?? 'Identifiants incorrects.';
    this.notif.error(this.errorMessage);
  }

  toggleVisibility() {
    this.visible = !this.visible;
    this.inputType = this.visible ? 'text' : 'password';
    this.cd.markForCheck();
  }
}
