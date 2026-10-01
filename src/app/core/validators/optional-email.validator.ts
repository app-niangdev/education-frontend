import { AbstractControl, ValidationErrors, Validators } from '@angular/forms';

/**
 * Email facultatif : valide le format uniquement si quelque chose est saisi.
 *
 * `Validators.email` rejette la chaîne vide, ce qui rendait le champ de fait
 * obligatoire alors que le serveur l'accepte en `nullable`. Un champ laissé
 * vide — ou vidé puis re-vidé — doit rester valide.
 */
export function optionalEmail(
  control: AbstractControl
): ValidationErrors | null {
  const valeur = control.value;

  if (valeur === null || valeur === undefined || `${valeur}`.trim() === '') {
    return null;
  }

  return Validators.email(control);
}
