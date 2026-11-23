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
Les profils enfants se créent dans **Gérer les profils**.

## Firebase

- Projet : `pocketclass-bd866` (`.firebaserc`)
- Règles : `firestore.rules`. Les parents (admins) ont un accès complet à leur famille ; les
  appareils liés (phase 5) lisent le catalogue et leur profil. Tout le reste est refusé.
- Après un déploiement, vérifier les en-têtes de cache (l'emulator ne les applique pas) :

```sh
curl -I https://pocketclass-bd866.web.app/                     # Cache-Control: no-cache
curl -I https://pocketclass-bd866.web.app/_app/immutable/...   # immutable
```

## Notes SvelteKit 3

- Pas de `svelte.config.js` : la config de Kit est dans `vite.config.ts`.
- `$lib` n'existe plus : importer avec `#lib/…` et l'extension (`#lib/firebase.ts`).
