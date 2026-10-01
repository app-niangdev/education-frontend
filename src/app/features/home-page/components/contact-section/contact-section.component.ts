import { Component, inject, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Etablissement } from 'src/app/interfaces/Etablissement';
import { EtablissementService } from 'src/app/auth/services/etablissement.service';

@Component({
  selector: 'app-contact-section',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section id="contact" class="bg-gray-50 py-16 md:py-20" aria-labelledby="contact-title">
      <div class="max-w-7xl mx-auto px-6 lg:px-8">

        <div class="flex flex-col lg:flex-row gap-12 lg:gap-16">

          <!-- Gauche : infos -->
          <div class="lg:w-80 flex-shrink-0">
            <h2 id="contact-title" class="text-3xl font-bold text-gray-900 mb-3">Contactez-nous</h2>
            <p class="text-gray-500 text-sm leading-relaxed mb-8">
              Une question sur les inscriptions ou nos programmes ? Envoyez-nous un message, notre équipe vous répondra rapidement.
            </p>

            <ul class="space-y-5" aria-label="Coordonnées">

              <!-- Téléphones -->
              <li *ngIf="etablissement?.telephone_principal || etablissement?.telephone_secondaire" class="flex items-start gap-3">
                <div class="w-9 h-9 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-primary-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                  </svg>
                </div>
                <div>
                  <p class="text-xs text-gray-400 font-medium mb-0.5">Téléphone</p>
                  <p class="text-sm font-bold text-gray-900">
                    <ng-container *ngIf="etablissement!.telephone_principal">
                      <a [href]="'tel:' + etablissement!.telephone_principal" class="hover:text-primary-700 transition-colors">{{ etablissement!.telephone_principal }}</a>
                    </ng-container>
                    <ng-container *ngIf="etablissement!.telephone_principal && etablissement!.telephone_secondaire"> / </ng-container>
                    <ng-container *ngIf="etablissement!.telephone_secondaire">
                      <a [href]="'tel:' + etablissement!.telephone_secondaire" class="hover:text-primary-700 transition-colors">{{ etablissement!.telephone_secondaire }}</a>
                    </ng-container>
                  </p>
                </div>
              </li>

              <!-- Email -->
              <li *ngIf="etablissement?.email" class="flex items-start gap-3">
                <div class="w-9 h-9 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-primary-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                </div>
                <div>
                  <p class="text-xs text-gray-400 font-medium mb-0.5">Email</p>
                  <a [href]="'mailto:' + etablissement!.email" class="text-sm font-bold text-gray-900 hover:text-primary-700 transition-colors break-all">{{ etablissement!.email }}</a>
                </div>
              </li>

              <!-- Adresse -->
              <li *ngIf="etablissement?.adresse" class="flex items-start gap-3">
                <div class="w-9 h-9 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-primary-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                </div>
                <div>
                  <p class="text-xs text-gray-400 font-medium mb-0.5">Adresse</p>
                  <p class="text-sm font-bold text-gray-900">{{ etablissement!.adresse }}</p>
                </div>
              </li>

            </ul>
          </div>

          <!-- Droite : formulaire -->
          <div class="flex-1">
            <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">

              <!-- Succès -->
              <div *ngIf="success" role="alert" class="flex items-center gap-3 bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3 mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span class="text-sm font-medium">Message envoyé avec succès !</span>
              </div>

              <!-- Erreur -->
              <div *ngIf="errorMessage" role="alert" class="flex items-center gap-3 bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-red-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span class="text-sm font-medium">{{ errorMessage }}</span>
              </div>

              <form [formGroup]="contactForm" (ngSubmit)="sendMessage()" novalidate class="space-y-5" aria-label="Formulaire de contact">

                <!-- Email de l'expéditeur -->
                <div>
                  <label for="email" class="block text-sm font-medium text-gray-700 mb-1.5">
                    Votre email <span class="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    formControlName="email"
                    placeholder="vous@exemple.com"
                    autocomplete="email"
                    inputmode="email"
                    class="w-full px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 bg-white border rounded-lg leading-relaxed transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    [class.border-red-400]="isInvalid('email')"
                    [class.border-gray-300]="!isInvalid('email')"
                    [attr.aria-invalid]="isInvalid('email')"
                    [attr.aria-describedby]="isInvalid('email') ? 'email-err' : 'email-help'"/>
                  <p *ngIf="!isInvalid('email')" id="email-help" class="mt-1.5 text-xs text-gray-400">
                    Nous utiliserons cette adresse pour vous répondre.
                  </p>
                  <p *ngIf="isInvalid('email')" id="email-err" role="alert" class="mt-1.5 text-xs text-red-600">
                    <span *ngIf="contactForm.get('email')?.hasError('required')">L'adresse email est obligatoire.</span>
                    <span *ngIf="contactForm.get('email')?.hasError('email')">Cette adresse email n'est pas valide.</span>
                  </p>
                </div>

                <!-- Titre -->
                <div>
                  <label for="titre" class="block text-sm font-medium text-gray-700 mb-1.5">
                    Titre <span class="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="titre"
                    type="text"
                    formControlName="titre"
                    placeholder="Objet de votre message"
                    autocomplete="off"
                    class="w-full px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 bg-white border rounded-lg leading-relaxed transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    [class.border-red-400]="isInvalid('titre')"
                    [class.border-gray-300]="!isInvalid('titre')"
                    [attr.aria-invalid]="isInvalid('titre')"
                    [attr.aria-describedby]="isInvalid('titre') ? 'titre-err' : null"/>
                  <p *ngIf="isInvalid('titre')" id="titre-err" role="alert" class="mt-1.5 text-xs text-red-600">
                    <span *ngIf="contactForm.get('titre')?.hasError('required')">Le titre est obligatoire.</span>
                    <span *ngIf="contactForm.get('titre')?.hasError('minlength')">3 caractères minimum.</span>
                  </p>
                </div>

                <!-- Message -->
                <div>
                  <label for="message" class="block text-sm font-medium text-gray-700 mb-1.5">
                    Message <span class="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <textarea
                    id="message"
                    formControlName="message"
                    rows="5"
                    placeholder="Écrivez votre message…"
                    class="w-full px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 bg-white border rounded-lg leading-relaxed resize-none transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    [class.border-red-400]="isInvalid('message')"
                    [class.border-gray-300]="!isInvalid('message')"
                    [attr.aria-invalid]="isInvalid('message')"
                    [attr.aria-describedby]="isInvalid('message') ? 'msg-err' : null"></textarea>
                  <p *ngIf="isInvalid('message')" id="msg-err" role="alert" class="mt-1.5 text-xs text-red-600">
                    <span *ngIf="contactForm.get('message')?.hasError('required')">Le message est obligatoire.</span>
                    <span *ngIf="contactForm.get('message')?.hasError('minlength')">10 caractères minimum.</span>
                  </p>
                </div>

                <!-- Bouton -->
                <button
                  type="submit"
                  [disabled]="sending"
                  class="w-full flex items-center justify-center gap-2 px-5 py-3 bg-primary-700 text-white text-sm font-semibold rounded-lg hover:bg-primary-800 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed">
                  <svg *ngIf="sending" class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  <svg *ngIf="!sending" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                  </svg>
                  {{ sending ? 'Envoi…' : 'Envoyer le message' }}
                </button>

              </form>
            </div>
          </div>

        </div>
      </div>
    </section>
  `
})
export class ContactSectionComponent implements OnInit, OnDestroy {
  @Input() etablissement: Etablissement | null = null;

  private readonly etablissementService = inject(EtablissementService);

  contactForm!: FormGroup;
  sending = false;
  success = false;
  errorMessage: string | null = null;

  /** Efface le bandeau de succès après quelques secondes. */
  private successTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.contactForm = this.fb.group({
      email:   ['', [Validators.required, Validators.email]],
      titre:   ['', [Validators.required, Validators.minLength(3)]],
      message: ['', [Validators.required, Validators.minLength(10)]],
    });
  }

  ngOnDestroy(): void {
    if (this.successTimer) {
      clearTimeout(this.successTimer);
    }
  }

  isInvalid(field: string): boolean {
    const ctrl = this.contactForm.get(field);
    return !!(ctrl?.invalid && (ctrl.dirty || ctrl.touched));
  }

  sendMessage(): void {
    this.contactForm.markAllAsTouched();
    if (this.contactForm.invalid || this.sending) return;

    this.sending = true;
    this.success = false;
    this.errorMessage = null;

    const { email, titre, message } = this.contactForm.getRawValue();

    this.etablissementService
      .envoyerMessageContact({ email, titre, message })
      .subscribe({
        next: () => {
          this.sending = false;
          this.success = true;
          this.contactForm.reset();
          if (this.successTimer) clearTimeout(this.successTimer);
          this.successTimer = setTimeout(() => { this.success = false; }, 5000);
        },
        error: (err) => {
          this.sending = false;
          this.errorMessage =
            err?.error?.message ??
            "L'envoi du message a échoué. Merci de réessayer plus tard.";
        },
      });
  }
}
