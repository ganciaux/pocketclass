# Entraînement (phase 2) — design

Date : 25 novembre 2026. Statut : validé par l'utilisateur (formules A puis C, option
« pragmatique » pour le stockage).

## Intention

L'enfant s'entraîne sur une fiche avec des exercices variés corrigés tout de suite, voit son
score, refait ses erreurs. Le parent voit le dernier et le meilleur score de chaque fiche. Plus
tard, un défi chrono (60 s) réutilise le même moteur.

## Formules de séance

- **A. Série courte** (cette phase) : jusqu'à 10 exercices `practice` de la fiche, tirés au
  hasard et répartis entre les points-clés (tour de rôle). Une tentative par question : juste →
  « Bravo », faux → la bonne réponse et l'`explanation`. Écran de fin : score, « Refaire mes
  erreurs » (série des seules questions ratées, ne change pas le score enregistré),
  « Recommencer », retour à la fiche.
- **C. Défi chrono** (étape suivante) : 60 s de questions rapides (`true_false`, `mcq`,
  `calculation` courts), record par fiche.
- **B. Jusqu'à maîtrise** : plus tard (demande beaucoup d'exercices ou des générateurs).

## Types d'exercices

Existants, désormais affichés : `mcq` (4 boutons mélangés), `cloze` (une saisie par trou),
`calculation` (nombre ou fraction `a/b`, comparé en valeur, irréductibilité si demandée),
`ordering` (toucher dans l'ordre), `open` (saisie, plusieurs réponses acceptées), `pair` (carte
recto/verso, l'enfant s'évalue), `paper` (sur papier, l'enfant compare à la réponse et
s'évalue). `generator` : ignoré tant que les générateurs n'existent pas.

Nouveaux (format `sheet@1`, ajout compatible) :

- `match` : `pairs: [{ left, right }]` (3 à 6), relier en touchant gauche puis droite ;
- `true_false` : `statement`, `answer: boolean` ;
- `categorize` : `categories` (2 à 4), `items: [{ text, category }]` (category ∈ categories) ;
- `explanation?` sur tous les exercices : une phrase affichée après la réponse.

Comparaison des saisies : sans accents, sans majuscules, espaces réduits, ponctuation finale
ignorée ; nombres : virgule ou point, fractions comparées en valeur.

## Données

- `profiles/{p}/attempts/{id}` (création seule, hors ligne) : `{ conceptId, subjectId,
  chapterId, mode: 'series', correct, total, answers: [{ exerciseId, correct }], createdAt }`.
- `profiles/{p}/progress/{conceptId}` gagne `practiceLast`, `practiceBest` (`{ correct, total }`)
  et `practicedAt`, écrits dans le même lot que l'attempt (pas en mode « refaire mes erreurs »).
- Mode test parent : écrit sur `childView.ownerId` comme le reste ; « Remettre à zéro » efface
  aussi les attempts.
- Règles : l'appareil de l'enfant crée ses attempts (clés et types contrôlés), jamais de mise à
  jour ni suppression ; progress accepte les trois nouvelles clés.

## Prompt

Environ 4 exercices `practice` par point-clé, de types variés (dont `match`, `categorize`
quand le sujet s'y prête), 8 à 10 `true_false` en `practice`, `explanation` sur chaque
exercice.

## Affichage

- Fiche : « S'entraîner » actif s'il y a des exercices jouables, avec dernier / meilleur score.
- Page `/concept/[id]/practice` : une question à la fois, barre de progression, correction.
- Profil enfant (parent) : carte « Entraînement », une ligne par fiche entraînée (dernier /
  meilleur score, date).

## Non-objectifs

Points et contrôles (phase 3), générateurs, étiquettes à toucher pour les textes à trous,
remarque sur un exercice, glisser-déposer.
