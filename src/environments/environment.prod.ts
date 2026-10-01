export const environment = {
  production: true,

  apiUrl: 'https://backendeducation.niangdev.com/api',

  current_page: 1,
  per_page: 10,
  total: 10,
  max_file_size: 2 * 1024 * 1024,
  pageSizeOptions: [5, 10, 15, 20, 25, 30],

  reverb: {
    enabled: true,
    // Doit être identique à REVERB_APP_KEY du backend.
    // C'est une clé PUBLIQUE (elle part dans le bundle JS) : ce n'est pas
    // un secret. Le secret, c'est REVERB_APP_SECRET, qui reste côté serveur.
    key: 'b70e375a9185fd54dda13b98e007815d',
    host: 'backendeducation.niangdev.com',
    port: 443,
    scheme: 'https' as 'http' | 'https'
  }
};
