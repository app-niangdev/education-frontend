import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TypeContrat } from 'src/app/interfaces/Contrat';

/**
 * Le bloc « contrat » des formulaires de création du personnel.
 *
 * Enseignant, trésorier et surveillant sont engagés aux mêmes conditions : ce
 * bloc est identique pour les trois, seul le libellé de la fonction change.
 * Il est monté dans le formulaire parent sous la clé `contrat`.
 */
@Component({
  selector: 'vex-contrat-form',
  templateUrl: './contrat-form.component.html',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatDividerModule
  ]
})
export class ContratFormComponent implements OnInit {
  /** Le groupe `contrat` du formulaire parent. */
  @Input({ required: true }) form!: FormGroup;

  /** Fonction proposée par défaut : « Enseignant », « Trésorier »… */
  @Input() fonctionParDefaut = '';

  readonly typesContrat: { value: TypeContrat; label: string }[] = [
    { value: 'permanent', label: 'Permanent' },
    { value: 'vacataire', label: 'Vacataire' },
    { value: 'stagiaire', label: 'Stagiaire' }
  ];

  readonly modesRemuneration = [
    { value: 'MENSUEL', label: 'Mensuelle' },
    { value: 'HORAIRE', label: 'Horaire' }
  ];

  ngOnInit(): void {
    if (this.fonctionParDefaut && !this.f('fonction').value) {
      this.f('fonction').setValue(this.fonctionParDefaut);
    }

    // La date de fin n'est exigée que des contrats bornés : la contrainte suit
    // le type choisi, au lieu d'être figée à la construction du formulaire.
    this.f('type_contrat').valueChanges.subscribe(() =>
      this.majContrainteDateFin()
    );
    this.majContrainteDateFin();
  }

  f(champ: string): AbstractControl {
    return this.form.get(champ)!;
  }

  /** Un permanent est engagé sans terme ; les autres types ont une échéance. */
  get exigeDateFin(): boolean {
    return this.f('type_contrat').value !== 'permanent';
  }

  get estHoraire(): boolean {
    return this.f('mode_remuneration').value === 'HORAIRE';
  }

  /** Le montant ne veut rien dire sans son unité : le libellé la porte. */
  get labelMontant(): string {
    return this.estHoraire ? 'Taux horaire (FCFA/h)' : 'Salaire mensuel (FCFA)';
  }

  private majContrainteDateFin(): void {
    const dateFin = this.f('date_fin');

    if (this.exigeDateFin) {
      dateFin.addValidators(Validators.required);
    } else {
      dateFin.removeValidators(Validators.required);
    }

    dateFin.updateValueAndValidity({ emitEvent: false });
  }
}

/**
 * Construit le groupe `contrat`, avec ses valeurs par défaut et la règle qui
 * interdit une fin antérieure au début.
 *
 * Exporté plutôt qu'exposé par le composant : le formulaire parent doit pouvoir
 * déclarer le groupe à sa construction, avant que le composant n'existe.
 */
export function creerGroupeContrat(fb: FormBuilder): FormGroup {
  return fb.group(
    {
      type_contrat: ['permanent'],
      date_debut: [new Date().toISOString().slice(0, 10), [Validators.required]],
      date_fin: [''],
      duree_periode_essai: [
        null,
        [Validators.min(0), Validators.max(24)]
      ],
      salaire_base: [null, [Validators.min(0)]],
      mode_remuneration: ['MENSUEL'],
      fonction: [''],
      lieu_travail: [''],
      volume_horaire_hebdo: [
        null,
        [Validators.min(0), Validators.max(168)]
      ],
      observations: ['']
    },
    { validators: [finApresDebut] }
  );
}

/**
 * Un contrat qui se termine avant d'avoir commencé ne décrit rien de réel.
 * Le serveur applique la même règle : elle est ici pour l'annoncer tout de
 * suite, pas pour le remplacer.
 */
function finApresDebut(groupe: AbstractControl): ValidationErrors | null {
  const debut = groupe.get('date_debut')?.value;
  const fin = groupe.get('date_fin')?.value;

  if (!debut || !fin) {
    return null;
  }

  return new Date(fin) > new Date(debut) ? null : { finAvantDebut: true };
}

/**
 * Prépare le bloc `contrat` pour l'envoi.
 *
 * Un champ facultatif laissé vide vaut « non renseigné » : envoyé en chaîne
 * vide, il échouerait à la validation `date` ou `integer` du serveur alors que
 * l'utilisateur n'a simplement rien saisi.
 */
export function nettoyerContrat(
  contrat: Record<string, unknown>
): Record<string, unknown> {
  const nettoye: Record<string, unknown> = {};

  Object.entries(contrat ?? {}).forEach(([cle, valeur]) => {
    const vide =
      valeur === '' ||
      valeur === null ||
      valeur === undefined ||
      (typeof valeur === 'string' && valeur.trim() === '');

    if (!vide) {
      nettoye[cle] = typeof valeur === 'string' ? valeur.trim() : valeur;
    }
  });

  return nettoye;
}
