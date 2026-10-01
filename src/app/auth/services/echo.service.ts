import { inject, Injectable, NgZone, OnDestroy } from '@angular/core';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { ChannelAuthorizationData } from 'pusher-js/types/src/core/auth/options';
import { environment } from 'src/environments/environment';
import { AuthService } from './auth.service';

/**
 * La connexion WebSocket à Reverb.
 *
 * Trois points méritent d'être connus avant de toucher à ce fichier :
 *
 * 1. L'autorisation des canaux passe par `/api/broadcasting/auth`, déclarée à
 *    la main côté backend dans le groupe `jwt.auth`. La route par défaut de
 *    Laravel s'appuie sur le garde « web », donc sur une session de
 *    navigateur : l'application n'en ouvre aucune, elle authentifie par jeton.
 *
 * 2. Le jeton est lu à CHAQUE demande d'abonnement, pas capturé une fois pour
 *    toutes. Après un rafraîchissement de jeton, un en-tête figé enverrait un
 *    jeton périmé et tous les abonnements repartiraient en 401.
 *
 * 3. Les callbacks de Pusher s'exécutent hors de la zone Angular. Sans
 *    `ngZone.run()`, un message arrivé par le WebSocket mettrait bien à jour
 *    l'état, mais l'écran ne bougerait pas tant qu'un autre événement n'aurait
 *    pas déclenché la détection de changements.
 */
@Injectable({ providedIn: 'root' })
export class EchoService implements OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly ngZone = inject(NgZone);

  private echo: Echo<'pusher'> | null = null;

  /** Les canaux auxquels on est abonné, pour pouvoir tout défaire proprement. */
  private readonly canaux = new Set<string>();

  /**
   * Ouvre la connexion si elle ne l'est pas déjà. Appelée paresseusement par
   * les composants de messagerie : inutile d'ouvrir un WebSocket pour un
   * utilisateur qui ne consultera jamais ses messages.
   */
  connect(): void {
    if (this.echo || !environment.reverb.enabled) {
      return;
    }

    if (!environment.reverb.key) {
      console.warn(
        '[Echo] Aucune clé Reverb configurée : le temps réel reste inactif.'
      );
      return;
    }

    const { key, host, port, scheme } = environment.reverb;
    const chiffre = scheme === 'https';

    // laravel-echo attend Pusher sur l'objet global.
    (window as unknown as { Pusher: typeof Pusher }).Pusher = Pusher;

    // La construction du socket sort de la zone : sans cela, le heartbeat de
    // Pusher relancerait la détection de changements en continu et
    // l'application ne serait jamais au repos.
    this.ngZone.runOutsideAngular(() => {
      this.echo = new Echo({
        broadcaster: 'pusher',
        key,
        wsHost: host,
        wsPort: port,
        wssPort: port,
        forceTLS: chiffre,
        // En clair on ne veut pas que Pusher retombe sur ses serveurs publics.
        enabledTransports: chiffre ? ['ws', 'wss'] : ['ws'],
        disableStats: true,
        cluster: '',
        authEndpoint: `${environment.apiUrl.replace(/\/+$/, '')}/broadcasting/auth`,
        auth: {
          headers: {
            Accept: 'application/json'
          }
        },
        // Relu à chaque abonnement : voir le point 2 de l'en-tête.
        // Pusher 8 attend `Error | null` en premier argument du callback ; un
        // booléen y était accepté dans les versions antérieures.
        authorizer: (channel: { name: string }) => ({
          authorize: (
            socketId: string,
            callback: (
              erreur: Error | null,
              donnees: ChannelAuthorizationData | null
            ) => void
          ) => {
            const jeton = this.authService.getAccessToken();

            fetch(
              `${environment.apiUrl.replace(/\/+$/, '')}/broadcasting/auth`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Accept: 'application/json',
                  Authorization: `Bearer ${jeton ?? ''}`
                },
                body: JSON.stringify({
                  socket_id: socketId,
                  channel_name: channel.name
                })
              }
            )
              .then((reponse) => {
                if (!reponse.ok) {
                  throw new Error(`Autorisation refusée (${reponse.status})`);
                }
                return reponse.json();
              })
              .then((donnees: ChannelAuthorizationData) =>
                callback(null, donnees)
              )
              .catch((erreur: Error) => {
                console.error('[Echo] Abonnement refusé :', erreur);
                callback(erreur, null);
              });
          }
        })
      });
    });
  }

  /**
   * Écoute un événement sur un canal privé. Le callback est ramené dans la
   * zone Angular pour que l'affichage suive (point 3 de l'en-tête).
   */
  ecouter<T>(
    canal: string,
    evenement: string,
    callback: (charge: T) => void
  ): void {
    this.connect();

    if (!this.echo) {
      return;
    }

    this.canaux.add(canal);

    this.echo
      .private(canal)
      .listen(`.${evenement}`, (charge: T) =>
        this.ngZone.run(() => callback(charge))
      );
  }

  /** Quitte un canal. À appeler quand un composant cesse de s'y intéresser. */
  quitter(canal: string): void {
    if (!this.echo) {
      return;
    }

    this.echo.leave(canal);
    this.canaux.delete(canal);
  }

  /** Ferme tout : à la déconnexion, ou quand le service est détruit. */
  deconnecter(): void {
    if (!this.echo) {
      return;
    }

    for (const canal of this.canaux) {
      this.echo.leave(canal);
    }

    this.canaux.clear();
    this.echo.disconnect();
    this.echo = null;
  }

  /** Vrai si le socket est ouvert : sert à afficher l'état « temps réel ». */
  estConnecte(): boolean {
    return this.echo !== null;
  }

  ngOnDestroy(): void {
    this.deconnecter();
  }
}
