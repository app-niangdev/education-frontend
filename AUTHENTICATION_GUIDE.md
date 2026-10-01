# Guide d'authentification — Start Kit Laravel + Angular

> Document de référence pour la gestion du frontend Angular (`frontsc`).
> Basé sur une analyse complète du backend Laravel (`backend`) et du frontend existant.

---

## Table des matières

1. [Vue d'ensemble de l'architecture](#1-vue-densemble-de-larchitecture)
2. [Backend — Fonctionnement détaillé](#2-backend--fonctionnement-détaillé)
3. [Flux d'authentification complet](#3-flux-dauthentification-complet)
4. [Contrats API — Endpoints et payloads](#4-contrats-api--endpoints-et-payloads)
5. [Structure JWT — Tokens décodés](#5-structure-jwt--tokens-décodés)
6. [Frontend existant — État actuel](#6-frontend-existant--état-actuel)
7. [Ce qui doit être refait / corrigé dans frontsc](#7-ce-qui-doit-être-refait--corrigé-dans-frontsc)
8. [Architecture cible pour frontsc](#8-architecture-cible-pour-frontsc)
9. [Interfaces TypeScript à utiliser](#9-interfaces-typescript-à-utiliser)
10. [Guards et protection des routes](#10-guards-et-protection-des-routes)
11. [Intercepteurs HTTP](#11-intercepteurs-http)
12. [Gestion de la navigation par rôle](#12-gestion-de-la-navigation-par-rôle)
13. [Variables d'environnement](#13-variables-denvironnement)
14. [Règles et conventions à respecter](#14-règles-et-conventions-à-respecter)

---

## 1. Vue d'ensemble de l'architecture

```
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND (frontsc — Angular 17+ Standalone)                │
│  Framework UI : VEX (Material Design)                       │
│  Auth : JWT stocké en localStorage                          │
│  HTTP : HttpClient + Intercepteurs                          │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/JSON (Bearer Token)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  BACKEND (backend — Laravel 12)                             │
│  Auth : JWT custom via firebase/php-jwt (HS256)             │
│  Middleware : JwtAuthenticate                               │
│  Base de données : PostgreSQL                               │
│  URL API : http://localhost:8000/api                        │
└─────────────────────────────────────────────────────────────┘
```

### Technos clés
| Couche | Technologie |
|--------|------------|
| Backend | Laravel 12, PHP, PostgreSQL |
| Auth backend | `firebase/php-jwt` — JWT HS256 maison (PAS Sanctum, PAS Tymon/jwt-auth) |
| Frontend | Angular 17+ (standalone components) |
| UI | VEX (Material Design + Tailwind) |
| Notifications | ngx-toastr |
| Dates | Luxon |

---

## 2. Backend — Fonctionnement détaillé

### 2.1 — AuthController (`backend/app/Http/Controllers/AuthController.php`)

Le contrôleur gère 4 actions :

| Méthode | Route | Middleware | Description |
|---------|-------|-----------|-------------|
| `login()` | `POST /api/auth/login` | — | Connexion, retourne access + refresh token |
| `refresh()` | `POST /api/auth/refresh` | — | Renouvelle les tokens via refresh token |
| `logout()` | `POST /api/auth/logout` | `jwt.auth` | Déconnexion (côté client uniquement pour l'instant) |
| `me()` | `GET /api/auth/me` | `jwt.auth` | Retourne l'utilisateur authentifié |

### 2.2 — Middleware JWT (`JwtAuthenticate`)

Le middleware `jwt.auth` :
1. Extrait le Bearer token de l'en-tête `Authorization`
2. Décode avec la clé `APP_JWT_SECRET` (algo HS256)
3. Vérifie que `token_type === 'access'` (le refresh token est rejeté ici)
4. Charge l'utilisateur depuis la DB via `payload->sub` (user ID)
5. Injecte l'utilisateur dans la requête via `Auth::setUser($user)`

### 2.3 — Génération des tokens

**Access Token** (durée : 1h par défaut, configurable via `JWT_ACCESS_TTL`) :
```json
{
  "iss": "http://localhost/api",
  "aud": "http://localhost/api",
  "iat": 1234567890,
  "nbf": 1234567890,
  "exp": 1234571490,
  "sub": 1,
  "jti": "access_abc123",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "full_name": "Jean Dupont",
    "role": "Admin",
    "menus": []
  },
  "token_type": "access"
}
```

**Refresh Token** (durée : 30 jours, configurable via `JWT_REFRESH_TTL`) :
```json
{
  "iss": "http://localhost/api",
  "aud": "http://localhost/api",
  "iat": 1234567890,
  "nbf": 1234567890,
  "exp": 1237159890,
  "sub": 1,
  "jti": "refresh_xyz789",
  "token_type": "refresh"
}
```

### 2.4 — Modèle User

Champs fillable : `first_name`, `last_name`, `email`, `password`, `phone_one`, `phone_two`, `username`, `address`, `status`, `role_id`

Champ calculé : `full_name` (appended automatiquement = `first_name + ' ' + last_name`)

Relations : `role()` → `BelongsTo(Role)`

SoftDeletes activé.

### 2.5 — Login multi-identifiants

Le backend accepte **3 types d'identifiants** (un seul requis) :
- `email` (email valide)
- `username` (string)
- `phone` (string)

Toujours accompagné de `password` (requis).

### 2.6 — Menus dynamiques

Lors du login, le backend retourne les **menus autorisés** pour le rôle de l'utilisateur :
```php
Menu::whereHas('menuRoles', fn($q) => $q->where('role_id', $user->role_id))
    ->orderBy('position')->get()
```

Structure d'un Menu :
```json
{
  "id": 1,
  "code": "dashboard",
  "title": "Tableau de bord",
  "type": "link",
  "classes": "",
  "url": "/index/manager/home",
  "icon": "mat:home",
  "breadcrumbs": true,
  "position": 1
}
```

---

## 3. Flux d'authentification complet

```
┌──────────┐         ┌─────────────┐         ┌────────────┐
│  Login   │         │  AuthService │         │  Backend   │
│Component │         │             │         │  Laravel   │
└──────────┘         └─────────────┘         └────────────┘
     │                      │                      │
     │ login(credentials)   │                      │
     │─────────────────────▶│                      │
     │                      │ POST /api/auth/login  │
     │                      │─────────────────────▶│
     │                      │                      │ Auth::attempt()
     │                      │                      │ generateTokenPair()
     │                      │◀─────────────────────│
     │                      │ { data: {             │
     │                      │   access_token,       │
     │                      │   refresh_token,      │
     │                      │   token_type: Bearer, │
     │                      │   expires_in: 3600,   │
     │                      │   menus: [...]        │
     │                      │ }}                    │
     │                      │                      │
     │                      │ localStorage.setItem('access_token')
     │                      │ localStorage.setItem('refresh_token')
     │                      │ userSubject.next(user_from_jwt)
     │                      │ navigate() selon role │
     │◀─────────────────────│                      │
     │                      │                      │
```

### Flux de refresh token

```
Intercepteur détecte 401
        │
        ▼
POST /api/auth/refresh
  Headers: Authorization: Bearer <refresh_token>
        │
        ▼
Backend décode le refresh token
Vérifie token_type === 'refresh'
Charge l'utilisateur via payload.sub
Génère une nouvelle paire de tokens
        │
        ▼
{ data: { access_token, refresh_token, expires_in } }
        │
        ▼
Remplacer les tokens en localStorage
Rejouer la requête originale avec le nouveau access_token
```

---

## 4. Contrats API — Endpoints et payloads

### 4.1 — POST `/api/auth/login`

**Request body :**
```json
{
  "email": "user@example.com",
  "password": "motdepasse"
}
```
OU
```json
{
  "username": "jean_dupont",
  "password": "motdepasse"
}
```
OU
```json
{
  "phone": "771234567",
  "password": "motdepasse"
}
```

**Response 200 :**
```json
{
  "data": {
    "access_token": "eyJ0...",
    "refresh_token": "eyJ0...",
    "token_type": "Bearer",
    "expires_in": 3600,
    "menus": [
      {
        "id": 1,
        "code": "dashboard",
        "title": "Tableau de bord",
        "type": "link",
        "url": "/index/manager/home",
        "icon": "mat:home",
        "position": 1
      }
    ]
  }
}
```

**Response 401 :**
```json
{ "message": "Identifiants incorrects." }
```

**Response 422 (validation) :**
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "email": ["Fournissez un e-mail, un nom d'utilisateur ou un téléphone."],
    "password": ["Le mot de passe est obligatoire."]
  }
}
```

---

### 4.2 — POST `/api/auth/refresh`

**Headers :**
```
Authorization: Bearer <refresh_token>
```

**Response 200 :**
```json
{
  "data": {
    "access_token": "eyJ0...",
    "refresh_token": "eyJ0...",
    "token_type": "Bearer",
    "expires_in": 3600,
    "message": "Bienvenue à nouveau Jean Dupont"
  }
}
```

**Response 401 :**
```json
{ "message": "Token invalide ou expiré." }
```

---

### 4.3 — POST `/api/auth/logout`

**Headers :**
```
Authorization: Bearer <access_token>
```

**Response 200 :**
```json
{ "message": "Déconnexion réussie." }
```

---

### 4.4 — GET `/api/auth/me`

**Headers :**
```
Authorization: Bearer <access_token>
```

**Response 200 :**
```json
{
  "user": {
    "id": 1,
    "first_name": "Jean",
    "last_name": "Dupont",
    "full_name": "Jean Dupont",
    "email": "jean@example.com",
    "phone_one": "771234567",
    "phone_two": null,
    "username": "jean_dupont",
    "address": "Dakar",
    "status": true,
    "role_id": 1,
    "role": {
      "id": 1,
      "name": "Admin",
      "label": "Administrateur"
    }
  }
}
```

---

### 4.5 — Autres routes protégées

Toutes les routes sous `Route::middleware(['jwt.auth', 'shop.context'])` nécessitent :
```
Authorization: Bearer <access_token>
```

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/entreprises/list` | GET | Liste des entreprises |
| `/api/boutiques/list` | GET | Liste des boutiques |
| `/api/users/list` | GET | Liste des utilisateurs |
| `/api/users/add` | POST | Créer un utilisateur |
| `/api/users/show/{id}` | GET | Détail utilisateur |
| `/api/users/update/{id}` | PUT | Modifier utilisateur |
| `/api/users/disable/{id}` | DELETE | Désactiver utilisateur |
| `/api/clients/list` | GET | Liste des clients |
| `/api/transactions/list` | GET | Liste des transactions |

---

## 5. Structure JWT — Tokens décodés

### Extraire les données utilisateur du JWT (frontend)

```typescript
// Décoder sans lib externe
function decodeJwt(token: string): any {
  const payload = token.split('.')[1];
  return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
}

// Exemple de payload access token décodé
const payload = decodeJwt(accessToken);
// payload.sub       → user ID (number)
// payload.user.id   → user ID
// payload.user.email → email
// payload.user.full_name → "Jean Dupont"
// payload.user.role  → "Admin" | "Manager" | "Supervisor"
// payload.user.menus → []
// payload.exp        → timestamp d'expiration
// payload.token_type → "access"
```

---

## 6. Frontend existant — État actuel

### 6.1 — Ce qui existe déjà

| Fichier | Rôle | État |
|---------|------|------|
| `auth/services/auth.service.ts` | Service central d'authentification | **Incompatible** avec le backend JWT actuel |
| `auth/login/login.component.ts` | Formulaire de connexion | Partiellement utilisable |
| `auth/otp/otp.component.ts` | Vérification OTP | **À adapter** (le backend actuel n'a PAS d'OTP) |
| `core/guards/auth.guard.ts` | Guard de protection des routes | **À réécrire** |
| `core/interceptors/auth-interceptor.ts` | Intercepteur HTTP | **Incomplet** — ne gère pas le Bearer token |
| `core/navigation/navigation-loader.service.ts` | Chargement de la nav | **À adapter** pour utiliser les menus du JWT |
| `response-type/Type.ts` | Types de réponse API | **À adapter** |
| `interfaces/User.ts` | Interface User | **À corriger** |

### 6.2 — Problèmes identifiés dans le frontend actuel

1. **`AuthService` (auth.service.ts) — Incompatibilité majeure** :
   - Appelle `/api/authenticate` qui n'existe PAS dans le backend
   - Appelle `/api/verify-otp`, `/api/check-otp`, `/api/resend-otp` qui n'existent PAS
   - Utilise `withCredentials: true` (mode cookies Sanctum) alors que le backend utilise JWT Bearer
   - Ne stocke PAS les tokens JWT en localStorage
   - N'envoie PAS le Bearer token dans les requêtes

2. **`AuthInterceptor` — Incomplet** :
   - Se contente d'ajouter `withCredentials: true`
   - N'injecte PAS le `Authorization: Bearer <token>` header
   - N'implémente PAS le refresh automatique sur 401

3. **`AuthGuard` — Appelle `checkAuthStatus()`** qui elle-même appelle `/api/authenticate` inexistant.

4. **`LoginComponent`** — Gère des cas (`requires_otp`, `must_change_password`) qui ne sont PAS implémentés dans ce backend.

5. **Interface `User`** — Contient des champs non présents dans le backend actuel (`image_url`, `profile_photo_path`, `requires_otp`, `birth_date`, `nationality`...).

6. **`OtpComponent`** — Toute la logique OTP référence des endpoints inexistants dans le backend.

---

## 7. Ce qui doit être refait / corrigé dans frontsc

### Priorité 1 — Critique (bloquant)

- [ ] **Réécrire `AuthService`** pour utiliser les bons endpoints JWT
- [ ] **Réécrire `AuthInterceptor`** pour injecter le Bearer token et gérer le refresh automatique
- [ ] **Réécrire `AuthGuard`** pour vérifier le JWT en localStorage (sans appel API inutile)
- [ ] **Corriger `LoginComponent`** — supprimer les cas OTP et must_change_password (non implémentés backend)

### Priorité 2 — Important

- [ ] **Corriger l'interface `User`** pour correspondre exactement au modèle backend
- [ ] **Adapter `Type.ts`** — corriger `AuthResponse` pour matcher la vraie réponse du login
- [ ] **Adapter `NavigationLoaderService`** pour utiliser les menus renvoyés par le backend au login
- [ ] **Activer les Guards** dans `app.routes.ts` (ils sont commentés)

### Priorité 3 — Amélioration

- [ ] Implémenter un service de décodage JWT pour extraire les données utilisateur côté client
- [ ] Gérer l'expiration du access token proactivement (avant le 401)
- [ ] Implémenter les guards de rôle (`AdminGuard`, `ManagerGuard`) actuellement commentés

---

## 8. Architecture cible pour frontsc

### 8.1 — Service AuthService (réécriture complète)

```typescript
// auth/services/auth.service.ts — CIBLE
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly ACCESS_TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';

  private userSubject = new BehaviorSubject<UserFromToken | null>(null);
  public user$ = this.userSubject.asObservable();

  constructor() {
    // Au démarrage, recharger l'utilisateur depuis le JWT stocké
    this.loadUserFromStoredToken();
  }

  login(credentials: LoginRequest): Observable<LoginApiResponse> {
    return this.http.post<LoginApiResponse>(`${apiUrl}/auth/login`, credentials).pipe(
      tap(response => {
        this.storeTokens(response.data.access_token, response.data.refresh_token);
        this.loadUserFromToken(response.data.access_token);
        this.navigateByRole();
      })
    );
  }

  refresh(): Observable<RefreshApiResponse> {
    const refreshToken = this.getRefreshToken();
    return this.http.post<RefreshApiResponse>(
      `${apiUrl}/auth/refresh`, {},
      { headers: { Authorization: `Bearer ${refreshToken}` } }
    ).pipe(
      tap(response => {
        this.storeTokens(response.data.access_token, response.data.refresh_token);
      })
    );
  }

  logout(): void {
    // Appel backend (best effort), puis nettoyage local immédiat
    this.http.post(`${apiUrl}/auth/logout`, {}).subscribe();
    this.clearTokens();
    this.userSubject.next(null);
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    const token = this.getAccessToken();
    return !!token && !this.isTokenExpired(token);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  private storeTokens(access: string, refresh: string): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, access);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refresh);
  }

  private clearTokens(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
  }

  private loadUserFromStoredToken(): void {
    const token = this.getAccessToken();
    if (token && !this.isTokenExpired(token)) {
      this.loadUserFromToken(token);
    }
  }

  private loadUserFromToken(token: string): void {
    const payload = this.decodeJwt(token);
    this.userSubject.next(payload.user);
  }

  private isTokenExpired(token: string): boolean {
    const payload = this.decodeJwt(token);
    return payload.exp < Date.now() / 1000;
  }

  private decodeJwt(token: string): JwtPayload {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  }

  private navigateByRole(): void {
    const user = this.userSubject.getValue();
    if (!user) return;
    const role = user.role.toLowerCase();
    const routes: Record<string, string> = {
      admin: '/index/manager/home',
      manager: '/index/manager/home',
      supervisor: '/index'
    };
    this.router.navigate([routes[role] ?? '/index']);
  }
}
```

### 8.2 — Intercepteur HTTP (réécriture complète)

```typescript
// core/interceptors/jwt.interceptor.ts — CIBLE
@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshSubject = new BehaviorSubject<string | null>(null);

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.authService.getAccessToken();
    const authReq = token ? this.addToken(req, token) : req;

    return next.handle(authReq).pipe(
      catchError(error => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          return this.handle401(authReq, next);
        }
        return throwError(() => error);
      })
    );
  }

  private addToken(req: HttpRequest<any>, token: string): HttpRequest<any> {
    return req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  private handle401(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshSubject.next(null);

      return this.authService.refresh().pipe(
        switchMap(response => {
          this.isRefreshing = false;
          const newToken = response.data.access_token;
          this.refreshSubject.next(newToken);
          return next.handle(this.addToken(req, newToken));
        }),
        catchError(err => {
          this.isRefreshing = false;
          this.authService.logout();
          return throwError(() => err);
        })
      );
    }

    // File d'attente pour les requêtes simultanées pendant le refresh
    return this.refreshSubject.pipe(
      filter(token => token !== null),
      take(1),
      switchMap(token => next.handle(this.addToken(req, token!)))
    );
  }
}
```

### 8.3 — Guard Auth (réécriture)

```typescript
// core/guards/auth.guard.ts — CIBLE
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};
```

---

## 9. Interfaces TypeScript à utiliser

### `LoginRequest`
```typescript
export interface LoginRequest {
  email?: string;
  username?: string;
  phone?: string;
  password: string;
}
```

### `LoginApiResponse` (réponse réelle du backend)
```typescript
export interface LoginApiResponse {
  data: {
    access_token: string;
    refresh_token: string;
    token_type: 'Bearer';
    expires_in: number;
    menus: Menu[];
  };
}
```

### `RefreshApiResponse`
```typescript
export interface RefreshApiResponse {
  data: {
    access_token: string;
    refresh_token: string;
    token_type: 'Bearer';
    expires_in: number;
    message: string;
  };
}
```

### `JwtPayload` (token décodé)
```typescript
export interface JwtPayload {
  iss: string;
  aud: string;
  iat: number;
  nbf: number;
  exp: number;
  sub: number;
  jti: string;
  user: UserFromToken;
  token_type: 'access' | 'refresh';
}

export interface UserFromToken {
  id: number;
  email: string;
  full_name: string;
  role: string;
  menus: Menu[];
}
```

### `User` (modèle complet — résultat de GET /api/auth/me)
```typescript
export interface User {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone_one: string | null;
  phone_two: string | null;
  username: string | null;
  address: string | null;
  status: boolean;
  role_id: number;
  role: Role;
}
```

### `Role`
```typescript
export interface Role {
  id: number;
  name: string;  // "Admin" | "Manager" | "Supervisor"
  label: string;
}
```

### `Menu` (menu retourné par le backend)
```typescript
export interface Menu {
  id: number;
  code: string;
  title: string;
  type: string;
  classes: string;
  url: string;
  icon: string;
  breadcrumbs: boolean;
  position: number;
}
```

### `ApiError`
```typescript
export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}
```

---

## 10. Guards et protection des routes

### Routes actuelles dans `app.routes.ts`

```
/                     → AuthRoutes (login, otp, forgot, reset, change-password)
/login                → LoginComponent
/otp                  → OtpComponent
/forgot-password      → ForgotPasswordComponent
/reset-password       → ResetPasswordComponent
/change-password      → ChangePasswordComponent
/index                → LayoutComponent (protégé par AuthGuard)
/index/manager/*      → ManagerRoutes (protégé par AuthGuard + ManagerGuard)
/index/profile/*      → ProfileRoutes (protégé par AuthGuard)
```

### Guards à implémenter/activer

| Guard | Fichier | Logique | État |
|-------|---------|---------|------|
| `AuthGuard` | `core/guards/auth.guard.ts` | `isLoggedIn()` → true sinon `/login` | À réécrire |
| `AfterLoginGuard` | `core/guards/after-login.guard.ts` | Si déjà connecté → rediriger selon rôle | Commenté, à activer |
| `AdminGuard` | `core/guards/admin.guard.ts` | `role === 'Admin'` sinon `/index` | Commenté, à activer |
| `ManagerGuard` | `core/guards/manager.guard.ts` | `role === 'Manager' \|\| Admin` | Commenté, à activer |

### Routes cibles avec guards actifs

```typescript
export const appRoutes: VexRoutes = [
  {
    path: '',
    loadChildren: () => import('./auth/auth-route'),
    canActivate: [AfterLoginGuard]  // Si connecté, rediriger directement
  },
  {
    path: 'index',
    loadComponent: () => import('./layouts/layout/layout.component').then(m => m.LayoutComponent),
    canActivate: [AuthGuard],       // ACTIVER ce guard
    children: [
      {
        path: 'manager',
        loadChildren: () => import('./features/manager/manager.route'),
        canActivate: [ManagerGuard]  // ACTIVER ce guard
      },
      {
        path: 'profile',
        loadChildren: () => import('./layouts/components/profile/profile.routes')
      }
    ]
  }
];
```

---

## 11. Intercepteurs HTTP

### Pipeline d'intercepteurs (ordre important)

```typescript
// core/interceptors/index.ts — CIBLE
export const httpInterceptorProviders = [
  { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true },     // 1. Injecte le token
  { provide: HTTP_INTERCEPTORS, useClass: ServerErrorInterceptor, multi: true } // 2. Gère les 500
];
```

### Ce que fait `JwtInterceptor` (à créer)
1. Récupère le `access_token` depuis `localStorage`
2. Clone la requête en ajoutant `Authorization: Bearer <token>`
3. Si la réponse est `401` :
   - Tente un refresh via `POST /api/auth/refresh` (avec le `refresh_token`)
   - Si succès : stocke les nouveaux tokens, rejoue la requête originale
   - Si échec : appelle `authService.logout()` → redirige vers `/login`
4. Pour les requêtes simultanées pendant le refresh : file d'attente via `BehaviorSubject`

### Endpoints exemptés du token

Ne pas injecter de token pour :
- `POST /api/auth/login`
- `POST /api/auth/refresh`

---

## 12. Gestion de la navigation par rôle

### Approche actuelle (NavigationLoaderService)

La navigation est construite **statiquement en frontend** selon le rôle.

### Approche recommandée (exploitant les menus du backend)

Le backend retourne les menus au moment du login dans `data.menus`. Ces menus peuvent être :
1. Stockés en `localStorage` avec les tokens
2. Rechargés depuis le JWT payload (si les menus sont dans le token)
3. Chargés via `GET /api/auth/me` à chaque démarrage

### Mapping des rôles aux routes

| Rôle | Route de redirection après login |
|------|----------------------------------|
| `Admin` | `/index/manager/home` |
| `Manager` | `/index/manager/home` |
| `Supervisor` | `/index` |

### Structure de navigation actuelle (NavigationLoaderService)

```
Admin → "Gestion Entreprise" (/index/admin/company/list)
     → "Paramètres Généraux" (/admin/settings)

Manager → "Tableau de bord" (/index/manager/home)
        → "Utilisateurs" (/index/manager/customer)
        → "Élèves" (/index/manager/student)
        → "Niveaux" (/index/manager/levels)
        → "Classes" (/index/manager/classes)
        → "Années scolaires" (/index/manager/school-year)
        → "Inscriptions" (/index/manager/enrollment)
        → "Informations scolaires" (/index/manager/school-info)
```

---

## 13. Variables d'environnement

### Frontend (`frontsc/src/environments/environment.ts`)
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000/api',
  current_page: 1,
  per_page: 10,
  total: 10,
  max_file_size: 2 * 1024 * 1024,      // 2 MB
  pageSizeOptions: [5, 10, 15, 20, 25, 30]
};
```

### Backend (`backend/.env`)
```
APP_URL=http://localhost
APP_JWT_SECRET="k7PHte10jSYd58tIqOJJRH9ZbNgqwrw9dPTqLER2abjjpgIzGbC3wUmR/zp6DRcAbhyxgcj7cqzZZylvCJK8SG2A=="
JWT_ACCESS_TTL=3600       # 1 heure
JWT_REFRESH_TTL=2592000   # 30 jours
DB_CONNECTION=pgsql
DB_DATABASE=startkit
```

---

## 14. Règles et conventions à respecter

### Conventions générales
- Tous les composants auth sont **standalone** (pas de NgModule)
- Utiliser `inject()` plutôt que le constructeur pour l'injection de dépendances
- Notifications via `NotificationService` (wrapper ngx-toastr) — ne pas utiliser MatSnackBar directement
- Tous les appels HTTP passent par des services — jamais directement dans les composants

### Gestion des tokens
- `access_token` → `localStorage` avec clé `access_token`
- `refresh_token` → `localStorage` avec clé `refresh_token`
- À la déconnexion : vider les deux clés immédiatement (ne pas attendre la réponse backend)

### Gestion des erreurs HTTP
- `401` → tentative de refresh → si échec, logout + `/login`
- `403` → afficher "Action non autorisée" via `NotificationService`
- `422` → afficher les erreurs de validation champ par champ
- `500` → `ServerErrorInterceptor` redirige vers `/error-500`

### Structure de réponse backend (convention ApiResponse)
```typescript
// Succès standard
{ status: 200, message: "Succès", payload: <data> }

// Succès paginé
{ status: 200, message: "Succès", payload: [...], meta: { current_page, per_page, total, last_page } }

// Erreur
{ status: 4xx|5xx, message: "Message d'erreur", errors?: {...} }

// Note: le login ne suit PAS ce format — il retourne { data: { ... } }
```

### Clés localStorage utilisées

| Clé | Valeur | Utilisé par |
|-----|--------|-------------|
| `access_token` | JWT string | `AuthService`, `JwtInterceptor` |
| `refresh_token` | JWT string | `AuthService`, `JwtInterceptor` |
| `otpEmail` | string | `OtpStateService` |
| `requiresOtp` | boolean (JSON) | `OtpStateService` |
| `timeOtp` | number (JSON) | `OtpStateService` |

### Packages disponibles dans frontsc
```json
{
  "@angular/material": "^17.x",
  "ngx-toastr": "...",
  "luxon": "...",
  "@vex/...": "UI template VEX"
}
```

---

## Résumé des actions immédiates

```
1. Réécrire auth.service.ts
   → Utiliser /api/auth/login, /api/auth/refresh, /api/auth/logout
   → Stocker les tokens en localStorage
   → Décoder le JWT pour en extraire l'utilisateur

2. Réécrire JwtInterceptor
   → Injecter Authorization: Bearer <access_token>
   → Gérer le refresh automatique sur 401

3. Réécrire AuthGuard (functional guard)
   → Vérifier localStorage + expiration JWT

4. Corriger LoginComponent
   → Supprimer la logique OTP et must_change_password (pas implémentée backend)
   → Adapter pour la nouvelle réponse { data: { access_token, ... } }

5. Activer les guards dans app.routes.ts
   → canActivate: [AuthGuard] sur /index

6. Corriger les interfaces TypeScript
   → User, LoginApiResponse, RefreshApiResponse
```
