# Tampon « notion acquise » — design (court)

Date : 24 novembre 2026. Statut : validé par l'utilisateur.

## Intention

Le parent vérifie avec l'enfant (questions à l'oral, exercice) puis **tamponne** la fiche :
« Acquise ». Le tampon vient du parent (option A), il a donc de la valeur. Plus tard (phase 3),
un contrôle réussi pourra le poser tout seul.

## Design

- **Stockage** : champ `acquiredAt` (heure serveur) sur `profiles/{id}/progress/{conceptId}`.
  Absent = pas acquise. Retirer le tampon = `deleteField()`. Écrit avec `inBackground()`
  (marche hors ligne, comme la progression). Un tampon posé sur une fiche jamais ouverte crée
  le document sans `openedAt`.
- **Règles** : l'appareil enfant ne crée pas de document avec `acquiredAt` et ne peut ni le
  poser, ni le changer, ni l'enlever ; il peut toujours écrire `openedAt` / `readAt` sur un
  document tamponné. Le parent (admin) écrit déjà tout dans sa famille. Cas de tests ajoutés.
- **Logique pure** (`binder/binder.ts`) :
  - `isAcquired(progress)` ;
  - `sheetState` : un document sans `openedAt` (tampon seul) = fiche `new` ;
  - `Tally.acquired` (compte des fiches acquises) ;
  - `nextUnread` saute les fiches acquises (« Continuer » ne propose pas une notion acquise) ;
  - `seenSheets` ignore les documents sans `openedAt` (jamais ouverte = pas « vue »).
- **Indépendant de « lue »** : tamponner ne marque pas lue, et inversement.
- **Fiche, vue enfant** : tampon « Acquise » sous le titre, penché, bordure double à l'encre de
  la couleur de la matière (`SUBJECT_TEXT`), comme un tampon de prof.
- **Fiche, vue parent** : carte « Notion acquise » avec un bouton par enfant (« Tom » coché /
  non coché), chaque enfant lit sa propre progression sur la fiche.
- **Mode test** : sur la fiche, sous le tampon, un bouton « Tamponner (test) » / « Retirer le
  tampon (test) » qui écrit sur `childView.ownerId` (le profil du parent). « Remettre à zéro »
  l'efface déjà (`resetTestData` vide la progression).
- **Chapitre** (vue enfant) : l'étape d'une fiche acquise prend une étoile sur fond de la
  couleur de la matière (lue = coche verte), et la pastille « Acquise ».
- **Compteur** (`TallyLine`) : « · 2 acquises » quand il y en a, donc sur l'accueil enfant, la
  page matière et la page de l'enfant côté parent.

## Non-objectifs

Demande de l'enfant (« je pense l'avoir acquise ») ; tampon automatique (phase 3) ; historique
des tampons ; points.
