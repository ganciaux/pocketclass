# PocketClass

PWA familiale de révision (fiches, exercices, contrôles) pour collégiens.
SvelteKit 3 + Svelte 5, Firebase (Auth, Firestore, Hosting).

## Prérequis

- Node 24 (`nvm use 24`, voir `.nvmrc`) : Firebase 13 exige Node ≥ 24.12
- Firebase CLI (`npm i -g firebase-tools`) et Java 21 pour les emulators

## Installation

```sh
nvm use 24
npm install
cp .env.example .env.local
```

Remplis `.env.local` avec la config de l'app web Firebase (console Firebase → Paramètres du
projet → Vos applications, ou `firebase apps:sdkconfig WEB --project pocketclass-bd866`).
`.env.local` est ignoré par Git. La config web Firebase est publique par nature : la sécurité
repose sur les règles Firestore.

| Variable               | Rôle                                             |
| ---------------------- | ------------------------------------------------ |
| `PUBLIC_FIREBASE_*`    | Config de l'app web Firebase                     |
| `PUBLIC_USE_EMULATORS` | `true` : en dev, l'app se connecte aux emulators |

Les variables sont déclarées dans `src/env.ts` (SvelteKit 3) et importées depuis
`$app/env/public`.

## Développement

Deux terminaux :

```sh
# Terminal 1 : emulators Firebase (Auth 9099, Firestore 8080, Hosting 5000, UI http://127.0.0.1:4000)
npm run emulators

# Terminal 2 : l'app (avec PUBLIC_USE_EMULATORS=true dans .env.local)
npm run dev
```

En mode emulator, « Se connecter avec Google » ouvre une fenêtre de faux comptes : crée un
compte fictif. Les données sont visibles dans l'UI des emulators et repartent de zéro à chaque
redémarrage.

Premier login parent : l'app crée la famille, le profil parent et l'index `users/{uid}`.
Rien à configurer dans la console Firebase : le parent (admin) est celui qui a créé la famille
(`families.admins`, `profile.role = admin`).

Les profils enfants se créent dans **Gérer les profils**. Pour connecter le téléphone d'un
enfant : ouvrir son profil → **Lier un appareil** affiche un code (6 caractères, 10 minutes,
usage unique) ; sur le téléphone de l'enfant, ouvrir l'app → « Je suis un enfant » → saisir le
code. L'enfant reste connecté (compte anonyme Firebase) ; s'il perd la session (données
effacées, nouveau téléphone), il suffit d'un nouveau code : sa progression est rattachée à son
profil. Le parent peut délier un appareil à tout moment. En local, tester avec une deuxième
fenêtre de navigation privée pour l'enfant.

## Tester la PWA (service worker, hors-ligne)

Le service worker n'existe que dans un build. Avec les emulators lancés :

```sh
npm run build:emulators   # build connecté aux emulators (jamais utilisé pour déployer)
npm run preview           # http://localhost:4173
```

Ouvre une fiche, puis DevTools → Application → Service workers (vérifier qu'il est actif),
coche « Offline » et recharge : la fiche doit rester consultable et l'indicateur « Hors-ligne »
apparaître. DevTools → Application → Manifest doit indiquer que l'app est installable.

## Tests et vérifications

```sh
npm run check      # svelte-check
npm run lint       # vérifie le formatage (npm run format pour corriger)
npm run test       # Vitest (schémas, import, fractions, rendu Markdown, textes, exactitude de l'exemple)
npm run test:rules # règles Firestore (lance l'emulator Firestore tout seul)
npm run schemas    # régénère static/schemas/*.json
```

## Déploiement

```sh
npm run prod          # vérifie tout (check, lint, tests, règles) puis déploie app + règles
npm run deploy:app    # app seule
npm run deploy:rules  # règles Firestore seules
```

Détails, liens et retour arrière : [docs/operations.md](docs/operations.md).

## Firebase

- Projet : `pocketclass-bd866` (`.firebaserc`)
- Règles : `firestore.rules`. Les parents (admins) ont un accès complet à leur famille ; les
  appareils enfants liés lisent le catalogue et leur profil, et n'écrivent que leur pseudo /
  avatar, leurs fiches lues et leurs remarques. Tout le reste est refusé.
  Tests : `npm run test:rules`.
- Famille : son id est l'uid du parent (premier login rejouable sans doublon).
- Architecture et conventions du code : voir `CLAUDE.md`.
- Après un déploiement, vérifier les en-têtes de cache (l'emulator ne les applique pas) :

```sh
curl -I https://pocketclass-bd866.web.app/                     # Cache-Control: no-cache
curl -I https://pocketclass-bd866.web.app/_app/immutable/...   # immutable
```

## Notes SvelteKit 3

- Pas de `svelte.config.js` : la config de Kit est dans `vite.config.ts`.
- `$lib` n'existe plus : importer avec `#lib/…` et l'extension (`#lib/firebase.ts`).
