# Cartes de révision — design (court)

Date : 26 novembre 2026. Statut : à valider. Choix de l'utilisateur : cartes écrites par l'IA
avec un secours pour les fiches déjà importées ; paquet au niveau fiche, chapitre ou classeur ;
deux piles « Je sais » / « À revoir » ; classement gardé dans la progression de l'enfant.

## Contenu d'une carte

- **Recto** : une question courte (une règle, une définition, un « vrai ou faux »).
- **Verso** : la réponse en une ou deux phrases, et un exemple tiré du cours (facultatif).
- **Étiquette** : Définition, Règle, Méthode, Vrai ou faux, Piège.

**Format** : champ facultatif `flashcards` de `sheet@1` (et des fiches de `chapter@1`), pas de
changement de version :
`[{ "tag": "definition|rule|method|true_false|pitfall", "front": "…", "back": "…", "example": "…" }]`,
20 cartes au plus ; recto ≤ 160 caractères, verso ≤ 300, exemple ≤ 200 ; KaTeX permis.
Stocké sur `concepts/{id}.flashcards`, exporté avec la fiche.

**Prompt** : 8 à 15 cartes par fiche, dont 2 ou 3 « pitfall » sur les erreurs fréquentes ;
« vérifie l'exactitude de chaque réponse avant de l'écrire » ; une carte = une seule idée.

**Secours** (fiche sans `flashcards`) : une carte « Règle » par point-clé (recto : le point-clé ;
verso : les résumés des parties qui en parlent) et une carte « Piège » par piège de la fiche.
Rien à relire en plus : tout est déjà sur la fiche.

**Identifiant d'une carte** : `<fiche>~<empreinte du recto>` (calculé, stable si l'IA change
l'ordre des cartes à la réimportation ; une carte réécrite repart « pas classée »).

## Paquets

- **Fiche** : bouton « Cartes » sur la fiche (à côté de « Carte mentale »).
- **Chapitre** : bouton « Réviser en cartes » sur la page du chapitre (toutes ses fiches).
- **Classeur** : même bouton sur la page de la matière (toutes les fiches du classeur).
- Ordre : celui des fiches, puis « Mélanger ». Case « Seulement les cartes à revoir ».

## Jeu

- Une carte à la fois, façon **fiche bristol** (lignes bleues, marge rouge, coin de l'étiquette).
  Toucher la carte (ou « Retourner », ou Espace) la **retourne en 3D** sur l'axe vertical ; le
  verso est au dos. Mouvement réduit : simple fondu.
- « Précédente » / « Suivante » (flèches du clavier aussi).
- « Je sais » (vert) / « À revoir » (rouge), visibles une fois la carte retournée ; classer
  passe à la suivante. Compteurs : je sais, à revoir, pas encore classées.
- Fin du paquet : le bilan et « Recommencer » / « Seulement les cartes à revoir ».
- Pas de points (comme la carte mentale).

## Sauvegarde

- `progress/{fiche}.cardsKnown` et `cardsReview` : listes d'identifiants de cartes (50 au plus
  chacune). Classer une carte l'ajoute à une liste et la retire de l'autre (`arrayUnion` /
  `arrayRemove`, `inBackground()`, hors ligne). Un paquet de chapitre ou de classeur écrit dans
  la progression de chaque fiche concernée.
- Mode test : sur le profil du parent (effacé par « Remettre à zéro ») ; parent hors mode test :
  gardé en mémoire le temps de la visite.
- Règles : deux listes de chaînes, 50 au plus ; cas de test.

## Code

- Pur, testé : `src/lib/flashcards/cards.ts` — `cardsOf(sheet)` (cartes de l'IA ou secours,
  identifiants), `deckOf(sheets)`, `pileOf(cardId, progress)`, `counts(deck, progress)`,
  `visibleCards(deck, progress, onlyReview)`.
- Schéma `flashcardSchema` dans `schemas/sheet.ts` (+ import, export, prompt, échantillon).
- Composant `<FlashcardDeck>` ; trois routes fines : `/concept/[id]/cards`,
  `/chapter/[id]/cards`, `/subject/[id]/cards`.
- Hors périmètre : répétition espacée, statistiques des cartes, filtre par étiquette.
