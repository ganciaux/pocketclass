# PocketClass — état et idées en attente

Mis à jour le 24 novembre 2026. Le détail de chaque choix technique est dans
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
- **Mode test enfant** : le parent utilise l'app comme un enfant choisi (son classeur), avec
  ses propres données de test, remises à zéro quand il veut.
- **Remarques** : l'enfant écrit une remarque sur une fiche ; le parent les voit toutes
  (`/parent/notes`) et les marque vues ou réglées.
- **Identité visuelle** : thèmes clair et sombre tirés du logo, icônes de l'app (livre et
  crayon-fusée, sans le texte), icônes de matières, animations.
- **Outillage** : emulators sur les ports 8180 (Firestore) et 5050 (Hosting), tests des règles
  Firestore, `npm run verify` puis `npm run prod` pour déployer.

## En pause : phase 2 (entraînement)

Moteur d'exercices, générateurs `fractions.*`, vérification des réponses en valeur, historique
des tentatives (`attempts`).

Question à trancher avant de commencer : quand l'enfant lance l'entraînement sur une fiche,
comment se déroule la séance (série courte, sans fin, ciblée sur un point-clé…), et qu'est-ce
que le parent veut pouvoir regarder ensuite ?

À savoir :
- aujourd'hui, une fiche n'a que quelques exercices d'entraînement : l'entraînement n'est
  « illimité » qu'avec des générateurs ;
- l'affichage des 8 types d'exercices est sans doute le plus gros du travail ;
- un exercice `paper` ne se corrige pas automatiquement (autocorrection par l'enfant ?).

## Idées mises de côté

Notées telles quelles, sans décision. La colonne « À savoir » relie chaque idée à ce qui
existe déjà ou signale ce qu'il faudra trancher.

### Vue enfant et navigation

| Idée | À savoir |
| --- | --- |
| Des tags (mots-clés) sur les fiches, pour la recherche. | Conclusion du « procès » du 23 novembre : les mettre sur chaque fiche (pas sur la matière), écrits par l'IA dans le JSON de la fiche. |

### Remarques et photos

| Idée | À savoir |
| --- | --- |
| Pouvoir ajouter une remarque n'importe où. | Aujourd'hui : sur une fiche. Le champ pour une remarque sur un exercice existe déjà. |
| Envoyer des photos (copie de contrôle, illustration d'une remarque). | Pas de Firebase Storage sur le plan gratuit (les avatars sont stockés dans Firestore, compressés). Une photo de copie lisible ne tient pas facilement dans un document (1 Mo max) : choisir entre passer au plan Blaze et compresser fortement. Lié à la phase 4 (résumé photographié). |

### Révision active

| Idée | À savoir |
| --- | --- |
| Des cartes mentales simples, sur une page, avec un lien pour tester la notion sur 3 à 5 exemples. | Prévoir une dizaine d'exemples par notion et en tirer 3 à 5 sans retomber sur les mêmes ; quand tous sont sortis, on recommence (tirage sans remise). Il faut mémoriser par enfant ce qui est déjà sorti. Proche de l'entraînement de la phase 2. |
| Un tampon « notion acquise » sur une fiche. | À trancher : qui le pose (l'enfant, le parent, ou automatiquement après un contrôle réussi) ? |

### Points et historique (phase 3)

| Idée | À savoir |
| --- | --- |
| Un compteur de points sur le profil. | Le champ `points` existe déjà sur le profil. |
| Chaque fiche a un quota de points. | |
| Un contrôle est validé à 70 % de réussite minimum, et rapporte alors ses points. | Le brief prévoyait autre chose : 5 points par bonne réponse, +15 si sans-faute, et rejouer ne rapporte que l'amélioration. À réconcilier. |
| Réviser une fiche rapporte des points ; on peut la revoir, mais elle ne rapporte plus rien pendant une semaine. | |
| Garder l'historique des points comme un historique des activités (exercice, révision, contrôle…). | Le journal des points (`pointsLedger`) était prévu ; il deviendrait un journal d'activité. Il doit marcher hors ligne (écritures groupées, déjà prévu). |
