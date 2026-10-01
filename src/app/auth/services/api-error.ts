import { HttpErrorResponse } from '@angular/common/http';

/**
 * Extrait un message lisible d'une erreur d'API Laravel.
 *
 * Le back renvoie `{ message, errors: { champ: [messages] } }` : on privilégie la
 * première erreur de validation, bien plus utile qu'un « Erreur lors de la mise à
 * jour » générique quand une règle (url, email, unique...) rejette la requête.
 */
export function firstApiError(
  error: unknown,
  fallback = 'Erreur lors de la mise à jour'
): string {
  const body = (error as HttpErrorResponse)?.error;
  if (!body) return fallback;

  const errors = body.errors as Record<string, string[]> | undefined;
  if (errors) {
    for (const messages of Object.values(errors)) {
      if (messages?.length) return messages[0];
    }
  }

  return typeof body.message === 'string' && body.message ? body.message : fallback;
}
