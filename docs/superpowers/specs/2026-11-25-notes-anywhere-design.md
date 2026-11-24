# Remarque n'importe où — design (court)

Date : 25 novembre 2026. Statut : validé par l'utilisateur (option A).

## Intention

L'enfant peut noter une difficulté de partout, pas seulement en bas d'une fiche, sans avoir à
choisir à quoi la remarque se rapporte.

## Design

- **Bouton flottant** « Une difficulté ? » (en bas à droite, au-dessus de la zone sûre) sur
  les pages enfant (`session.childView` non nul) : accueil, matière, chapitre, « Mes fiches
  vues », « Mes remarques », profil. Masqué sur la fiche (qui a déjà sa carte), sur l'espace
  parent et sur l'écran de connexion. Il ouvre une fenêtre (`<dialog class="modal">`) avec le
  formulaire actuel (`NoteForm`) et une ligne « À propos de : chapitre « Fractions » » (ou
  « Remarque libre »).
- **Cible déduite de la page** (pur, testé) : `noteContext(routeId, params)` →
  `{ kind: 'chapter', id }`, `{ kind: 'subject', id }`, `{ kind: 'free' }` ou `null` (masqué).
- **Modèle** : `notes/{id}` gagne `subjectId: string | null` ; `conceptId` et `chapterId`
  deviennent `string | null`. Une remarque sur une fiche garde `conceptId` + `chapterId` (+
  `subjectId` pour les nouvelles). Sur un chapitre : `chapterId` seul ; sur une matière :
  `subjectId` seul ; libre : tout à `null`. Les anciennes remarques restent valides (pas de
  migration, `subjectId` absent = `null`).
- **Règles** : création avec ces clés seulement, chaque id `string` ou `null`. Cas de tests.
- **Affichage** (« Mes remarques », page parent) : `notePlace(note, catalogue)` (pur, testé)
  donne l'endroit, du plus précis au plus large : fiche (lien), chapitre (lien), matière
  (lien), « Remarque libre », ou « Fiche / chapitre / matière supprimé(e) ou masqué(e) ».
- **Suppressions parent** : supprimer un chapitre supprime aussi les remarques dont
  `chapterId` est ce chapitre ; une matière, celles dont `subjectId` est cette matière ou dont
  le chapitre est dans cette matière.
- **Mode test** : le bouton écrit sur `childView.ownerId` ; « Remettre à zéro » efface déjà
  toutes les remarques.

## Non-objectifs

Remarque sur un exercice (phase 2, `exerciseId` existe déjà) ; photo jointe ; choix manuel de
la cible.
