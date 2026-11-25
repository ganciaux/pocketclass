# PocketClass — état et idées en attente

Mis à jour le 25 novembre 2026. Le détail de chaque choix technique est dans
[CLAUDE.md](../CLAUDE.md) (« Technical decisions log »).

## Ce qui est fait

- **Base** : connexion parent (Google), profils enfants, téléphones enfants liés par un code
  à usage unique, pseudo et avatar, fonctionnement hors ligne, PWA installable (validée sur
  iOS et Android), proposition de mise à jour de l'app.
- **Classeur** : matière (par niveau) → chapitre (avec un groupe d'affichage facultatif) →
  fiche. Import d'une fiche (`sheet@1`) ou d'un chapitre (`chapter@1`) à partir d'un prompt
  construit par l'app. Le parent peut ordonner, masquer et supprimer.
- **Suivi** : fiche ouverte / lue, état « nouvelle » / « mise à jour », tableau de bord de
  l'enfant avec sa progression.
- **Vue enfant** : le niveau n'est plus affiché sur sa page matière (seulement pour une
  matière d'un autre niveau) ; dans une fiche, chaque point de « L'essentiel » mène à la
  première partie qui en parle.
- **Mes fiches vues** : l'enfant retrouve les fiches qu'il a ouvertes (les plus récentes
  d'abord), avec une recherche sans accents, un filtre par matière et un tirage au hasard.
- **Tags sur les fiches** : mots-clés écrits par l'IA dans le JSON, cherchables dans « Mes
  fiches vues » ; sur une fiche, toucher un tag lance la recherche.
- **Mot de passe parent** : rattaché au compte Google (même famille), connexion par e-mail et
  mot de passe, « mot de passe oublié ». À confirmer sur la vraie app (l'emulator bloque le
  rattachement).
- **Tampon « acquise »** : le parent tamponne une fiche pour un enfant après avoir vérifié
  avec lui ; l'enfant voit le tampon sur la fiche, une étoile dans le chapitre et « n
  acquises » dans ses compteurs. « Continuer » ne propose plus une fiche acquise. Plus tard
  (phase 3), un contrôle réussi pourra le poser tout seul.
- **Mode test enfant** : le parent utilise l'app comme un enfant choisi (son classeur), avec
  ses propres données de test, remises à zéro quand il veut.
- **Remarques** : l'enfant écrit une remarque sur une fiche, ou de n'importe quelle page avec
  le bouton « Une difficulté ? » (rattachée au chapitre, à la matière, ou libre) ; le parent
  les voit toutes (`/parent/notes`) et les marque vues ou réglées.
- **Identité visuelle** : thèmes clair et sombre tirés du logo, icônes de l'app (livre et
  crayon-fusée, sans le texte), icônes de matières, animations.
- **Outillage** : emulators sur les ports 8180 (Firestore) et 5050 (Hosting), tests des règles
  Firestore, `npm run verify` puis `npm run prod` pour déployer.

## À faire au prochain déploiement

Tout est poussé sur `main`, rien n'est déployé depuis le mot de passe parent.

- Lancer `npm run prod` : il déploie l'app **et les règles Firestore** (nécessaires au tampon
  « Acquise » et aux remarques n'importe où).
- Vérifier sur la vraie app :
  - rattacher un mot de passe au compte Google depuis « Mon profil », puis se connecter avec
    (l'emulator bloque ce rattachement) ;
  - sur le téléphone d'un enfant : ouvrir et marquer lue une fiche tamponnée « Acquise » ;
  - le bouton « Une difficulté ? » sur iPhone (au-dessus de la barre du bas, zone sûre).
- Facultatif : console Firebase → Authentication → Modèles, langue des e-mails en français
  (e-mail « mot de passe oublié »).
- Sur iPhone : voir si les reconnexions fréquentes cessent (stockage persistant demandé,
  connexion par mot de passe possible).

## En cours : phase 2 (entraînement)

Fait (2026-11-25) : séries de 10 questions (formule A) avec score, « Refaire mes erreurs »,
nouveaux types (relier, vrai/faux, classer) et explication après chaque réponse, dernier et
meilleur score sur la fiche, carte « Entraînement » sur la page de l'enfant côté parent ;
défi chronométré de 60 s (formule C) avec record par fiche ; générateurs d'exercices (25, en
4 familles : calcul, algèbre, géométrie, conversions), choisis par l'IA dans le JSON, qui
complètent les séries et rendent le défi illimité (conception :
`docs/superpowers/specs/2026-11-25-generators-design.md`).

Ensuite :
- « jusqu'à maîtrise » (formule B, plus tard) ;
- trous à choisir dans une liste (aujourd'hui saisis au clavier) ;
- générateurs : un exemple de question générée dans l'aperçu d'import ; une saisie
  d'expression (développer, factoriser) au lieu du QCM ; d'autres familles (statistiques,
  probabilités, proportionnalité, physique-chimie).

## Idées mises de côté

Notées telles quelles, sans décision. La colonne « À savoir » relie chaque idée à ce qui
existe déjà ou signale ce qu'il faudra trancher.

### Charte graphique et mise en forme (à faire, demandé le 2026-11-25)

| Idée | À savoir |
| --- | --- |
| Revoir la mise en forme des liens de liste côté parent : matières sur `/parent/subjects`, chapitres sur `/parent/subjects/[id]`, fiches sur `/parent/chapters/[id]`. | Aujourd'hui des lignes avec `OrderActions` (↑ ↓ masquer supprimer). Viser le même style que les cartes enfant (bordure moutarde et titre souligné au survol) sans gêner les boutons d'action. |
| Une charte de couleurs des boutons selon l'action. | À fixer une fois pour toutes dans `CLAUDE.md` (styling), par ex. : principale = moutarde plein, navigation = moutarde doux, secondaire = ghost, suppression = rouge doux, validation = vert. Puis passer sur toutes les pages. |
| Colorer les filtres de `/chapter/[id]` selon l'état : Toutes = jaune, Acquises = vert, Ratées = rouge, etc. ; renommer « Commencées » en « En cours ». | Reprendre les couleurs des repères du parcours et des badges (`SheetStateBadge`) pour que filtre, badge et repère d'une même fiche aient la même couleur. |

### Vue enfant et navigation

| Idée | À savoir |
| --- | --- |

### Remarques et photos

| Idée | À savoir |
| --- | --- |
| Envoyer des photos (copie de contrôle, illustration d'une remarque). | Pas de Firebase Storage sur le plan gratuit (les avatars sont stockés dans Firestore, compressés). Une photo de copie lisible ne tient pas facilement dans un document (1 Mo max) : choisir entre passer au plan Blaze et compresser fortement. Lié à la phase 4 (résumé photographié). |

### Révision active

| Idée | À savoir |
| --- | --- |
| Des cartes mentales simples, sur une page, avec un lien pour tester la notion sur 3 à 5 exemples. **À prévoir** (demandé à nouveau le 2026-11-25). | Prévoir une dizaine d'exemples par notion et en tirer 3 à 5 sans retomber sur les mêmes ; quand tous sont sortis, on recommence (tirage sans remise). Il faut mémoriser par enfant ce qui est déjà sorti. Proche de l'entraînement de la phase 2. |

### Points et historique (phase 3)

| Idée | À savoir |
| --- | --- |
| ~~Un compteur de points sur le profil.~~ | **Fait (2026-11-25)** : affiché sur l'accueil de l'enfant et sur sa page côté parent. |
| ~~Chaque fiche a un quota de points.~~ | **Fait** : 10 points par point-clé par défaut, réglable par fiche. |
| ~~Un contrôle est validé à 70 % de réussite minimum, et rapporte alors ses points.~~ | **Fait** : seuil réglable par fiche, points gagnés une seule fois (première réussite), tampon « Acquise » automatique, tampon « Raté » et nouvel essai après une série d'entraînement (conception : `docs/superpowers/specs/2026-11-25-assessment-design.md`). |
| Réviser une fiche rapporte des points ; on peut la revoir, mais elle ne rapporte plus rien pendant une semaine. | |
| Garder l'historique des points comme un historique des activités (exercice, révision, contrôle…). | Le journal des points (`pointsLedger`) était prévu ; il deviendrait un journal d'activité. Il doit marcher hors ligne (écritures groupées, déjà prévu). |
