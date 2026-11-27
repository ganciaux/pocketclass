# PocketClass — build, déploiement et règles

Aide-mémoire des commandes de mise en production.

- Installation et développement : [README](../README.md).
- Choix techniques : [CLAUDE.md](../CLAUDE.md).

## Liens

| Quoi                              | Lien                                                         |
| --------------------------------- | ------------------------------------------------------------ |
| **L'app (production)**            | https://pocketclass-bd866.web.app                            |
| Adresse alternative               | https://pocketclass-bd866.firebaseapp.com                    |
| Console Firebase                  | https://console.firebase.google.com/project/pocketclass-bd866 |
| Règles Firestore (console)        | https://console.firebase.google.com/project/pocketclass-bd866/firestore/rules |
| Historique des versions (Hosting) | https://console.firebase.google.com/project/pocketclass-bd866/hosting |

## Avant toute commande

```sh
nvm use 24          # Firebase 13 exige Node ≥ 24.12
firebase login      # une seule fois par poste
```

Le projet Firebase par défaut est `pocketclass-bd866` (fichier `.firebaserc`).

## Raccourcis npm

| Commande               | Ce qu'elle fait                                                                                   | Quand l'utiliser                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `npm run prod`         | `verify`, puis `deploy` : tout vérifier, puis tout déployer. **S'arrête à la première erreur.**   | **La commande normale de mise en production.**           |
| `npm run verify`       | `check` + `lint` + `test` + `test:rules`                                                          | Avant un commit important ou un déploiement              |
| `npm run deploy`       | Build de production + déploiement de **l'app et des règles** (et des index)                       | Déployer sans relancer les vérifications                 |
| `npm run deploy:app`   | Build de production + déploiement de l'app seulement (Hosting)                                    | Changement d'interface sans modification des règles      |
| `npm run deploy:rules` | Déploiement des règles Firestore seulement (`firestore.rules` + `firestore.indexes.json`)         | Changement des règles seules                             |
| `npm run build`        | Build de production dans `build/` (sans déployer)                                                 | Vérifier que le build passe                              |
| `npm run test:rules`   | Tests des règles sur l'émulateur Firestore                                                        | Après toute modification de `firestore.rules`            |

⚠️ **Les règles et l'app vont ensemble.** Une fonctionnalité qui écrit de nouvelles données a
besoin des nouvelles règles, sinon elle est refusée en production. C'est le cas de la liaison
des appareils, des remarques, de la progression et du classeur (chapitres). En cas de doute, utiliser `npm run prod` ou
`npm run deploy`, qui envoient les deux.

## Mettre en production (cas normal)

```sh
nvm use 24
npm run prod
```

Puis vérifier :

1. Ouvrir https://pocketclass-bd866.web.app : un bandeau « Une nouvelle version de PocketClass
   est prête » propose **Mettre à jour** (sinon elle démarre à la prochaine ouverture de l'app).
   Les apps déjà ouvertes vérifient les mises à jour toutes les heures.
2. Contrôler les en-têtes de cache (l'émulateur ne les applique pas) :

   ```sh
   curl -I https://pocketclass-bd866.web.app/        # Cache-Control: no-cache
   ```

3. Vérifier la version servie : `https://pocketclass-bd866.web.app/_app/version.json` doit
   correspondre à `build/_app/version.json`.

## Mettre à jour uniquement les règles

1. Modifier `firestore.rules`.
2. Ajouter un cas dans `tests/rules/firestore.rules.test.ts`.
3. Lancer :

   ```sh
   npm run test:rules
   npm run deploy:rules
   ```

Les règles s'appliquent en quelques secondes, sans redéployer l'app. On peut les relire dans la
console (lien plus haut).

## Revenir en arrière

- **App** : console Firebase → Hosting → historique des versions → « Restaurer » sur la version
  précédente. Autre solution : `git checkout <commit>`, puis `npm run deploy:app`.
- **Règles** : revenir à l'ancien `firestore.rules` avec git, puis `npm run deploy:rules`. La
  console garde aussi l'historique des règles.

## Pièges connus

- **`test:rules` (et donc `verify` / `prod`)** réutilise l'émulateur Firestore s'il tourne
  déjà (`npm run emulators`), sinon il en démarre un le temps des tests
  (`scripts/test-rules.ts`). Les tests utilisent le projet `demo-pocketclass-rules` et
  n'effacent jamais les données de développement.
- **Le build de déploiement ne doit pas pointer sur les emulators** : `npm run build` (utilisé
  par les commandes de déploiement) ignore `PUBLIC_USE_EMULATORS`. `npm run build:emulators`
  sert uniquement aux tests locaux.
- **Changement du modèle de données** : si une nouvelle version lit les anciennes données
  autrement, réimporter les fiches concernées depuis « Gérer le classeur ».
- **Passage au classeur (2026-11-24)** : les anciens parcours (`paths`, `assignments`) ne sont
  plus lus. Après ce déploiement, recréer les matières et réimporter le contenu (l'exemple :
  « Importer un chapitre complet » → « Charger l'exemple »). La progression de test est perdue.

## Installer PocketClass pour une autre famille

Chaque famille amie a **sa propre copie** : son projet Firebase, son adresse, ses données. Rien
n'est partagé avec ton projet (pas de données d'enfants chez toi, quotas gratuits séparés). Il
faut une personne à l'aise avec un terminal pour la première installation ; ensuite, les mises à
jour se font avec `git pull` puis `npm run prod`.

1. **Le code** : cloner le dépôt (ou un fork) et installer, avec Node 24 :

   ```sh
   git clone <adresse du dépôt> pocketclass && cd pocketclass
   nvm use 24 && npm install
   ```

2. **Le projet Firebase** (plan gratuit Spark) sur https://console.firebase.google.com :
   - « Ajouter un projet » (Google Analytics inutile) ;
   - **Authentication** → « Commencer » → activer **Google**, puis **Adresse e-mail/Mot de
     passe** (le mot de passe lié au compte Google, utile sur iPhone) et **Anonyme** (les
     téléphones des enfants) ;
   - **Firestore Database** → « Créer une base de données », emplacement `eur3` (Europe), mode
     production (les règles du dépôt sont envoyées à l'étape 4) ;
   - Paramètres du projet → « Vos applications » → ajouter une application **Web** (sans
     Hosting à cette étape) et noter sa configuration.

3. **Brancher la copie sur ce projet** :
   - `.firebaserc` : remplacer `pocketclass-bd866` par l'id du nouveau projet (ou
     `firebase use --add`) ;
   - copier `.env.example` en `.env.local`, y coller la configuration Web, et mettre
     `PUBLIC_USE_EMULATORS=false` pour la production.

4. **Déployer** : `firebase login`, puis `npm run prod` (vérifie tout, puis envoie l'app, les
   règles et les index). L'app est à `https://<id du projet>.web.app`.

5. **Premier parent** : ouvrir l'adresse, « Se connecter avec Google » ; la famille est créée.
   **Deuxième parent** : « Profils » → carte « Parents » → inviter son adresse Google ; à sa
   première connexion, ce parent arrive dans la même famille (s'il s'était déjà connecté, un
   bandeau « Rejoindre » s'affiche sur son accueil). Les enfants : « Profils » → créer l'enfant → code de
   liaison sur son téléphone.

6. **Les classeurs** : partir des fichiers JSON d'un autre classeur (« Gérer les classeurs » →
   export, puis « Restaurer » chez l'autre famille), ou les créer avec les prompts de l'app.

Pour tester sur sa machine avant de déployer : `PUBLIC_USE_EMULATORS=true` dans `.env.local`,
`npm run emulators` puis `npm run dev` (voir le README).
