# Tags sur les fiches — design (court)

Date : 24 novembre 2026. Statut : validé par l'utilisateur.

## Intention

Retrouver une fiche par ses notions (« dénominateur », « COD »…) et pas seulement par son titre.
Conclusion du « procès » du 23 novembre : les mots-clés vont **sur chaque fiche**, écrits par
l'IA externe dans le JSON.

## Design

- **Format** `sheet@1` (et `chapter@1`, qui contient des fiches) : champ facultatif
  `tags: string[]`, défaut `[]`, 10 au maximum, chaque tag 1 à 30 caractères après `trim`.
  Doublons retirés automatiquement (comparaison sans casse ni accents), pas d'erreur. Pas de
  nouvelle version de format : un champ facultatif ne casse aucun ancien fichier.
- **Prompt** (`prompts/sheetPrompt.ts`) : `"tags"` dans le modèle JSON + règle « 3 à 8
  mots-clés en français, en minuscules, ceux qu'un élève taperait pour retrouver la fiche
  (notions, vocabulaire, méthodes), sans répéter le nom de la matière ».
- **Stockage** : `concepts/{id}.tags` (écrit par le plan d'import, remplacé à chaque
  réimport ; les fiches importées avant n'en ont pas → traité comme `[]`).
- **Recherche** : `searchText` de `binder/seen.ts` inclut les tags.
- **Fiche** : tags en pastilles sous le titre. En vue enfant (`session.childView`), chaque
  pastille est un lien vers `/me/sheets?q=<tag>` ; la page « Mes fiches vues » lit `q` pour
  pré-remplir la recherche. Côté parent : pastilles simples.

## Non-objectifs

Édition manuelle des tags par le parent ; recherche côté parent ; tags sur les matières.
