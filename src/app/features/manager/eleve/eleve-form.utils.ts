/**
 * Utilitaires partages entre le formulaire de creation (stepper) et les
 * dialogues d'edition par section de la fiche detail.
 */

/**
 * Les champs `nullable` du backend rejettent la chaine vide : on la convertit
 * en null. Utile pour tous les champs optionnels du formulaire.
 */
export function trimOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return (value as string | null) ?? null;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Le datepicker Material produit un objet Date ; Laravel attend `YYYY-MM-DD`.
 * On formate a partir des composantes locales : `toISOString()` bascule en UTC
 * et peut reculer la date d'un jour selon le fuseau.
 */
export function toApiDate(value: unknown): string | null {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value as string);

  if (Number.isNaN(date.getTime())) return null;

  const mois = `${date.getMonth() + 1}`.padStart(2, '0');
  const jour = `${date.getDate()}`.padStart(2, '0');

  return `${date.getFullYear()}-${mois}-${jour}`;
}

/** Applique `cleanup` a un groupe de valeurs de formulaire. */
export function cleanupValues<T extends Record<string, unknown>>(value: T): T {
  const out: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(value)) {
    out[key] = typeof val === 'string' ? trimOrNull(val) : val;
  }

  return out as T;
}
