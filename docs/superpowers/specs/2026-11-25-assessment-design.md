# Contrôle de fiche — conception

Date : 2026-11-25. Phase 3 (contrôle, points). Choix de l'utilisateur :

- les questions sont **générées autant que possible**, pour qu'un nouvel essai ne se réussisse
  pas en connaissant les réponses ;
- **seuil de réussite 70 %**, réglable par fiche (parent) ;
- **points** : 10 par point-clé par défaut, réglables par fiche ; gagnés **une seule fois** par
  fiche, à la première réussite ;
- la réussite pose le tampon **« Acquise »** (avec sa date), qui reste ; un nouvel essai sert à
  améliorer le **meilleur score** ;
- un échec (fiche pas encore acquise) pose un tampon **« Raté »** (tête triste dessinée) et
  **bloque un nouvel essai jusqu'à une série d'entraînement terminée** (n'importe quel score) ;
- **correction à la fin** : aucune indication pendant le contrôle, puis chaque question avec
  juste / faux, la bonne réponse et l'explication.

## Tirage

Pour chaque point-clé de la fiche, `draw.perKeyPoint` questions (2 par défaut) :

1. d'abord des questions **générées** par les générateurs de ce point-clé (entraînement ou
   contrôle : la question est neuve à chaque fois), sans répéter un même énoncé ;
2. complétées par les exercices écrits **« contrôle »** de ce point-clé (limités à
   `exerciseIds` s'il est donné).

Les exercices auto-évalués (`pair`, `paper`) sont exclus : un contrôle est corrigé par
l'application. Un point-clé sans question est sauté. Les questions sont mélangées.

Chaque fiche a un contrôle : l'import écrit toujours le document `assessments/{id}` (par
défaut `{ type: "test", draw: { perKeyPoint: 2 } }` si le JSON n'en a pas).

## Réglages (parent)

Sur la page de la fiche : seuil (%) et points. Stockés seulement s'ils sont changés
(`passRate`, `points` sur le document du contrôle) et **conservés par un nouvel import** ;
sinon valeurs par défaut (70 %, 10 × nombre de points-clés). L'ancien barème `scoring`
(jamais utilisé) disparaît.

## Enregistrement (hors ligne, un seul lot)

- un `attempts` en mode `assessment` (historique) ;
- sur la progression : `assessmentLast`, `assessmentBest`, `assessedAt` ;
- réussite : `acquiredAt` posé s'il manque, `failedAt` et `retakeLocked` retirés ; à la
  première réussite, `assessmentPoints` (points gagnés), une ligne `pointsLedger`
  d'identifiant fixe `assessment-<fiche>` et `points` du profil augmenté (`increment()`) ;
- échec sur une fiche non acquise : `failedAt` et `retakeLocked: true` ; une série
  d'entraînement terminée retire `retakeLocked`.

## Règles Firestore

L'enfant peut poser `acquiredAt` (jamais le changer ni l'enlever) seulement si
`assessmentLast` atteint le seuil du contrôle ; la ligne de points est créée une seule fois, du
bon montant, avec un contrôle réussi ; `points` du profil n'augmente que du montant de la
ligne créée dans le même lot.

## Mode test

Tout va sur le profil du parent ; « Remettre à zéro » efface aussi le journal de points et
remet ses points à 0.
