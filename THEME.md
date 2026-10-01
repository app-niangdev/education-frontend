# Changer le thème de l'application

Le thème est défini dans un seul fichier : **`tailwind.config.ts`**, dans l'objet `default` de `themes`.

---

## Comment ça fonctionne

Il y a 3 couleurs à configurer :

| Couleur | Rôle | Actuellement |
|---|---|---|
| `primary` | Couleur principale (sidebar, boutons, liens actifs) | Indigo (`colors.indigo`) |
| `accent` | Couleur d'accentuation (badges, highlights) | Amber (`colors.amber`) |
| `warn` | Couleur d'erreur/avertissement | Red (`colors.red`) |

Tailwind fournit des palettes prêtes à l'emploi accessibles via `colors.*`.

---

## Exemples de changement

### Thème Vert

```ts
// tailwind.config.ts
primary: {
  defaults: { lighter: '100', default: '600', darker: '700' },
  palette: { ...colors.green }
},
accent: {
  defaults: { lighter: '100', default: '500', darker: '700' },
  palette: { ...colors.lime }
},
```

### Thème Orange

```ts
primary: {
  defaults: { lighter: '100', default: '600', darker: '700' },
  palette: { ...colors.orange }
},
accent: {
  defaults: { lighter: '100', default: '500', darker: '700' },
  palette: { ...colors.yellow }
},
```

### Thème Beige / Neutre

Tailwind n'a pas de palette "beige" native. Utilise des couleurs hex personnalisées :

```ts
primary: {
  defaults: { lighter: '100', default: '600', darker: '700' },
  palette: {
    '50':  '#faf7f2',
    '100': '#f0e9db',
    '200': '#e2d2b8',
    '300': '#cfb48e',
    '400': '#bc9468',
    '500': '#a87a4e',
    '600': '#8f6340',
    '700': '#744e34',
    '800': '#5e3f2d',
    '900': '#4e3527',
    '950': '#2a1a12',
  }
},
accent: {
  defaults: { lighter: '100', default: '500', darker: '700' },
  palette: { ...colors.stone }
},
```

### Thème Violet / Purple

```ts
primary: {
  defaults: { lighter: '100', default: '600', darker: '700' },
  palette: { ...colors.violet }
},
accent: {
  defaults: { lighter: '100', default: '500', darker: '700' },
  palette: { ...colors.fuchsia }
},
```

### Thème Bleu ciel / Sky

```ts
primary: {
  defaults: { lighter: '100', default: '600', darker: '700' },
  palette: { ...colors.sky }
},
accent: {
  defaults: { lighter: '100', default: '500', darker: '700' },
  palette: { ...colors.cyan }
},
```

---

## Palettes Tailwind disponibles

Voici toutes les palettes utilisables directement avec `...colors.NOM` :

`slate` `gray` `zinc` `neutral` `stone` `red` `orange` `amber` `yellow` `lime` `green` `emerald` `teal` `cyan` `sky` `blue` `indigo` `violet` `purple` `fuchsia` `pink` `rose`

---

## Étapes pour changer le thème

1. Ouvre `tailwind.config.ts`
2. Dans l'objet `default > colors > primary > palette`, remplace `...colors.indigo` par la palette souhaitée
3. (Optionnel) Fais de même pour `accent`
4. Relance le build : `ng build --configuration production`

> Le changement prend effet après rebuild. Aucune autre modification n'est nécessaire.
