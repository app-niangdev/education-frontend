export const environment = {
  production: false,
  // apiUrl: 'http://localhost:8000/api',
  current_page: 1,
  per_page: 10,
  total: 10,
  max_file_size: 2 * 1024 * 1024,
  pageSizeOptions: [5, 10, 15, 20, 25, 30],

  /**
   * Messagerie temps réel (Reverb).
   *
   * `key` doit valoir REVERB_APP_KEY côté backend : c'est la clé publique, elle
   * n'ouvre aucun canal privé à elle seule — chaque abonnement est validé par
   * /broadcasting/auth, qui exige le JWT.
   *
   * `enabled: false` désactive le WebSocket sans toucher au reste : les
   * messages continuent de partir en HTTP, seule la mise à jour instantanée
   * disparaît.
   */
  reverb: {
    enabled: true,
    key: 'b70e375a9185fd54dda13b98e007815d',
    host: 'localhost',
    port: 8080,
    scheme: 'http' as 'http' | 'https'
  }
};
