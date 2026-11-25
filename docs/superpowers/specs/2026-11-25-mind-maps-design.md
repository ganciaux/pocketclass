# Cartes mentales — design (court)

Date : 25 novembre 2026. Statut : validé par l'utilisateur (A + feuilles écrites par l'IA +
test sur les exercices de la fiche). Les classeurs peuvent être réimportés.

## Contenu

- **Une carte par fiche** : centre = titre de la fiche ; branches = points-clés (numérotés
  comme « L'essentiel ») ; feuilles = 1 à 4 mots ou formules courtes par branche.
- **Format** : champ facultatif `mindMap` de `sheet@1` (et des fiches de `chapter@1`) :
  `[{ "keyPoint": "<id>", "leaves": ["…"] }]`, une entrée par point-clé au plus, feuille ≤ 60
  caractères (KaTeX permis). Le prompt le demande. Stocké sur `concepts/{id}.mindMap`, exporté
  avec la fiche. Sans `mindMap` (fiches plus anciennes) : feuilles = titres des parties qui
  traitent ce point-clé (4 au plus).

## Me tester

- Une branche : 3 questions sur ce point-clé. Toute la carte : 5 questions, points-clés à tour
  de rôle. Questions = exercices d'entraînement écrits de la fiche, **sans remise par
  enfant** (`progress.mapDrawn` : ids déjà tirés ; quand le stock du tirage est épuisé, on
  recommence), complétés par les générateurs du point-clé (toujours nouveaux).
- Tirage enregistré au début du test (`inBackground`, hors ligne). Pas de points, pas
  d'`attempts`. Correction après chaque réponse (lecteur d'exercices existant). Mode test :
  écrit sur `childView.ownerId`, effacé par « Remettre à zéro » (progression).
- Règles : `mapDrawn` = liste de 200 ids au plus, écrite par l'appareil de l'enfant.

## Dessin

- Page `/concept/[id]/map`, bouton « Carte mentale » sur la fiche (moutarde doux).
- Fond **petits carreaux** de cahier (seul endroit de l'app), centre **surligné en jaune**
  (le `h1` de la page), branches en courbes à l'encre de la matière avec la pastille du
  point-clé, feuilles en étiquettes.
- Grand écran : centre au milieu, branches à gauche et à droite, courbes SVG mesurées sur le
  DOM. Téléphone : arbre vertical (centre en haut, branches en dessous reliées par un trait
  coudé). Un seul mouvement : les courbes se tracent au chargement (pas avec « réduire les
  animations »).
