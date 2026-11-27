# PocketClass — état et idées en attente

Mis à jour le 26 novembre 2026. Le détail de chaque choix technique est dans
[CLAUDE.md](../CLAUDE.md) (« Technical decisions log »).

## Ce qui est fait

- **JSON refusé** (2026-11-27) : bouton « Copier les erreurs pour l'IA » sous les erreurs
  (message prêt à coller dans la même conversation) ; une feuille de carte mentale un peu longue
  passe (60 caractères demandés, 90 acceptés).
- **Plusieurs parents** (2026-11-27) : un parent invite l'autre par son adresse Google (un
  bandeau « Rejoindre / Refuser » sur son accueil, même pour un nouveau compte), droits égaux
  (retirer, quitter ; le créateur de la famille reste).
- **Import d'un cours en plusieurs chapitres** (2026-11-27) : sur la page d'une matière,
  « Importer un cours » ; le prompt demande un chapitre par grand thème (jamais un chapitre
  fourre-tout), au moins 2 fiches par chapitre, et l'aperçu signale un chapitre d'une seule fiche.
- **Images dans les parties d'une fiche** (2026-11-27) : le parent ajoute jusqu'à 2 images sous
  chaque partie (photo d'une figure du cahier, d'un schéma), comprises dans la sauvegarde.
- **Figures de géométrie** (2026-11-27, première version) : l'IA décrit la figure (points,
  segments, angles droits, longueurs), l'app la dessine dans la fiche, les exemples et les
  exercices.
- **Lecture d'une fiche** (2026-11-27) : « Détails | Résumé » sur chaque partie (une icône : chevrons écartés = déplié, resserrés = replié, à côté des numéros de points-clés ; celle de toute la fiche dans « L'essentiel »), bouton pour
  remonter en haut (grande flèche, anneau de la partie lue). Plus de majuscules espacées (« Question 1 / 10 »…).
- **Glisser-déposer** (2026-11-27) : matières, chapitres, fiches (parent) et l'exercice « remettre
  dans l'ordre » se classent en faisant glisser une ligne par sa poignée, à la souris ou au
  doigt ; les flèches ↑ ↓ restent. Une autre famille installe sa
  propre copie avec son projet Firebase (guide dans `docs/operations.md`).
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
- **Tampon « acquise »** : posé par le parent (seulement pour les enfants qui voient la
  fiche) ou automatiquement par un contrôle réussi ; l'enfant voit le tampon sur la fiche, une
  étoile dans le chapitre et « n acquises » dans ses compteurs. Une fiche acquise compte comme
  lue. « Continuer » ne propose plus une fiche acquise.
- **Statistiques** (`/parent/stats`) : le parent choisit un enfant (ou « Mes tests ») ; vue
  globale (points, fiches lues / acquises, essais terminés, une carte par classeur) et vue
  détaillée d'un classeur (une ligne par fiche, les 20 derniers essais avec date et heure).
  Ouvertures et essais lancés comptés depuis fin novembre 2026.
- **Entraînement (phase 2)** : séries de 10 questions avec score et « Refaire mes erreurs »,
  défi chronométré de 60 s avec record, nouveaux types (relier, vrai/faux, classer),
  explication après chaque réponse, 25 générateurs d'exercices (calcul, algèbre, géométrie,
  conversions) ; scores sur la fiche et carte « Entraînement » côté parent.
- **Contrôle et points (phase 3)** : contrôle par fiche (questions tirées par point-clé,
  correction à la fin), réussi à 70 % (réglable par fiche), points gagnés une seule fois
  (10 par point-clé, réglable), tampon « Acquise » automatique ; un échec pose le tampon
  « Raté » et bloque un nouvel essai jusqu'à une série d'entraînement. Points sur l'accueil,
  par matière et sur la page de l'enfant côté parent.
- **Page chapitre** : repère « Raté » sur le parcours, filtres par état (acquises, ratées,
  nouvelles, lues…) avec leurs comptes.
- **Export et sauvegarde** : télécharger en JSON une fiche, un chapitre, une matière ou tous
  les classeurs ; restaurer une sauvegarde (fichier ou collage), ajoutée comme nouvelles
  matières.
- **Contenu réel** : premier chapitre de 6e (Gemini) importé ; l'import refuse les QCM aux
  options répétées, les catégories en double et les réponses contenant « -> » (corrections
  laissées par l'IA).
- **Charte graphique « trousse d'écolier »** : le prof corrige en rouge et vert, l'élève
  écrit en bleu, le surligneur jaune montre quoi faire, le crayon gris est le brouillon.
  Boutons classés par intensité ; une couleur par état de fiche, la même sur le filtre, la
  pastille, le repère et le tampon (« Acquise » en vert) ; « Commencées » devient « En
  cours » ; listes du parent avec survol surligneur sur toute la ligne.
- **Cartes mentales** : une carte par fiche sur papier à petits carreaux (notion surlignée au
  centre, une branche par point-clé, feuilles courtes écrites par l'IA, ou titres des parties
  pour les fiches plus anciennes) ; « Me tester » : 3 questions sur une branche, 5 sur toute
  la carte, sans retomber sur les mêmes avant d'avoir tout vu. Réimporter les classeurs pour
  avoir les feuilles écrites par l'IA.
- **Ergonomie** : confirmations dans une fenêtre (plus de `confirm()` du navigateur), boutons
  de suppression rouges avec une corbeille, boutons de navigation moutarde doux, survols
  teintés, grandes lignes de liens sur l'accueil de l'enfant.
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

Déploiement du 25 novembre fait et testé sur téléphone par l'utilisateur (2026-11-26).
Depuis : mise à jour d'un chapitre par son JSON, boutons courts de l'Espace parent, points de
révision, historique d'activité, fiches plus courtes avec vue « Résumé », images des cartes mentales, import depuis un fichier avec aperçu, sauvegarde complète, mode jour / nuit, erreurs à revoir, carte « Aujourd'hui », message quand un enregistrement échoue, points en gommette étoile (classeur, bandeau, accueil) et boutons Retour en écriture manuscrite, deuxième parent invité par e-mail. **Les règles Firestore ont changé** (révisions, images, invitations et parents) :

- Lancer `npm run prod` (app **et** règles ; jamais `deploy:app` seul avant les règles).
- Vérifier sur le téléphone d'un enfant : sur une fiche acquise, une série à 70 % ou plus
  affiche « +n points de révision », puis le sablier (fiche, « Mes révisions ») ; une
  deuxième série la même semaine ne rapporte rien.
- Images de carte mentale et images des parties d'une fiche : en ajouter une depuis un
  téléphone (photo), la voir côté enfant.
- Télécharger la sauvegarde complète (« Mon profil ») et la garder hors de Firebase ; sur iPhone, vérifier le téléchargement (« Partager → Enregistrer dans Fichiers » si besoin).
- Mode jour / nuit : choisir Sombre puis relancer l'app installée (pas de flash clair).
- Deuxième parent : « Profils » → « Parents » → inviter son adresse Google ; à sa connexion
  (Google), « Rejoindre » sur son accueil, puis vérifier l'accès aux classeurs et aux enfants, puis « Quitter la famille »
  (retour à sa propre famille).
- Import d'un cours : envoyer à l'IA les photos d'un cours de plusieurs thèmes avec le prompt
  « Importer un cours » d'une matière, vérifier le découpage proposé dans l'aperçu.
- Glisser-déposer au doigt (iPhone et Android) : une matière dans « Gérer les classeurs », et
  un exercice « remettre dans l'ordre » côté enfant ; la page ne doit pas défiler pendant le
  glissement.
- Réimport : coller un chapitre exporté (puis retouché) dans la page de **ce** chapitre ;
  corriger d'abord les « -> » laissés par Gemini dans le chapitre de français.

## À faire ensuite

Par ordre de demande ; le détail de chaque point est plus bas.

1. ~~Charte graphique et mise en forme~~ : **fait** (2026-11-25), charte « trousse
   d'écolier » (CLAUDE.md, styling).
2. ~~Cartes mentales~~ : **fait** (2026-11-25) ; images ajoutées par le parent (3 par fiche,
   2026-11-26).
3. ~~Statistiques d'un enfant~~ : **fait** (2026-11-25), vue globale / détaillée.
4. ~~Points de révision~~ : **fait** (2026-11-26) : sur une fiche acquise, une série à
   70 % rapporte 2 points par point-clé, puis sablier d'une semaine (sur la fiche, en fin de
   série et sur la page « Mes révisions »). ~~Historique d'activité~~ : **fait** (2026-11-26),
   page « Mon activité » (enfant) et section « Activité » des statistiques (parent).
5. ~~Erreurs à revoir~~ : **fait** (2026-11-26), page « Mes erreurs à revoir » (une question
   ratée revient le lendemain, puis 3 jours après, et disparaît après deux réussites).
6. ~~« Aujourd'hui » et série de jours~~ : **fait** (2026-11-26), carte en haut de l'accueil de
   l'enfant (jours d'affilée en bâtons, 3 choses à faire au plus).
9. ~~Cartes de révision~~ : **fait** (2026-11-26), paquet d'une fiche, d'un chapitre ou d'un
   classeur ; cartes écrites par l'IA (fiches à réimporter pour en avoir) ou fabriquées.
7. Suite de l'entraînement (ci-dessous).
8. ~~Harmoniser les polices~~ : **fait** (2026-11-26), deux polices : Permanent Marker pour
   l'écriture de l'app (nom, « Se déconnecter », boutons retour, étoile des points), Atkinson
   pour tout le reste, titres compris. Kalam retirée.

### Suite de l'entraînement

Conception : `docs/superpowers/specs/2026-11-25-practice-design.md` et
`2026-11-25-generators-design.md`.

- « jusqu'à maîtrise » (formule B, plus tard) ;
- trous à choisir dans une liste (aujourd'hui saisis au clavier) ;
- générateurs : un exemple de question générée dans l'aperçu d'import ; une saisie
  d'expression (développer, factoriser) au lieu du QCM ; d'autres familles (statistiques,
  probabilités, proportionnalité, physique-chimie).

### Figures de géométrie

- Suite de la première version : cercles et arcs, codage des longueurs égales et des angles,
  repère et droites ; les générateurs (Pythagore, Thalès) dessinent leur figure à chaque tirage.
- Image conseillée par l'IA (mis de côté le 2026-11-27, à revoir après quelques leçons de
  géométrie) : l'IA écrit un repère `[image : carte de France]` dans le texte d'une partie,
  masqué pour l'enfant, affiché au parent en encadré à côté de « Ajouter une image ». Écarté :
  la consigne en clair dans le texte (l'enfant la lirait) ; plus lourd : un champ `imageHint`.

### Glisser-déposer

- Défilement automatique près du bord : en tenant une ligne près du haut ou du bas de
  l'écran, la page défile toute seule (vitesse fixe à moins de 60 px du bord, boucle
  `requestAnimationFrame` dans `src/lib/sortable.ts`, la place d'arrivée recalculée à chaque
  pas). Pas utile tant qu'un chapitre tient sur un ou deux écrans ; à faire si un chapitre
  dépasse une quinzaine de fiches.

## Idées mises de côté

Notées telles quelles, sans décision. La colonne « À savoir » relie chaque idée à ce qui
existe déjà ou signale ce qu'il faudra trancher.

### Remarques et photos

| Idée | À savoir |
| --- | --- |
| Envoyer des photos (copie de contrôle, illustration d'une remarque). | Pas de Firebase Storage sur le plan gratuit (les avatars sont stockés dans Firestore, compressés). Une photo de copie lisible ne tient pas facilement dans un document (1 Mo max) : choisir entre passer au plan Blaze et compresser fortement. Lié à la phase 4 (résumé photographié). |

### Révision active

| Idée | À savoir |
| --- | --- |
| Une carte mentale d'un chapitre (centre = chapitre, branches = ses fiches). | Peut se construire sans l'IA à partir des données existantes ; idée laissée de côté lors des cartes de fiche (2026-11-25). |

### Points et historique (phase 3)

| Idée | À savoir |
| --- | --- |
| ~~Un compteur de points sur le profil.~~ | **Fait (2026-11-25)** : affiché sur l'accueil de l'enfant et sur sa page côté parent. |
| ~~Chaque fiche a un quota de points.~~ | **Fait** : 10 points par point-clé par défaut, réglable par fiche. |
| ~~Un contrôle est validé à 70 % de réussite minimum, et rapporte alors ses points.~~ | **Fait** : seuil réglable par fiche, points gagnés une seule fois (première réussite), tampon « Acquise » automatique, tampon « Raté » et nouvel essai après une série d'entraînement (conception : `docs/superpowers/specs/2026-11-25-assessment-design.md`). |
| ~~Réviser une fiche rapporte des points ; on peut la revoir, mais elle ne rapporte plus rien pendant une semaine.~~ | **Fait (2026-11-26)** : série ≥ 70 % sur une fiche acquise, 2 points par point-clé, sablier de 7 jours, page « Mes révisions ». |
| ~~Garder l'historique des points comme un historique des activités (exercice, révision, contrôle…).~~ | **Fait (2026-11-26)** : essais terminés et points gagnés, par jour, 30 jours puis « Voir plus ». Construit sans nouvelle écriture, à partir des essais et du journal des points. |
