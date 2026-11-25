# Générateurs d'exercices — conception

Date : 2026-11-25. Suite de la phase 2 (entraînement). Choix de l'utilisateur :

- les générateurs sont **choisis par l'IA dans le JSON**, dans un catalogue que le prompt liste ;
- développement et factorisation en **QCM d'erreurs typiques** (une saisie d'expression viendra
  peut-être plus tard) ;
- premier lot : **calcul, algèbre, géométrie, conversions d'unités** ;
- dans une série, les questions générées **complètent** les exercices écrits jusqu'à 10 ; dans
  le défi 60 s, elles sont illimitées.

## Principe

Un exercice `generator` du JSON (`{ "type": "generator", "generator": "units.length",
"keyPoint": "...", "difficulty": 2, "params": {} }`) n'est pas joué tel quel : à chaque tirage,
la fonction du générateur fabrique un **exercice ordinaire** (`calculation`, `mcq` ou
`true_false`) avec sa réponse et une explication. Le lecteur, la correction, les scores et le
défi ne changent pas.

Un générateur = une fonction pure `generate(random, { difficulty, params })`, testée sur des
centaines de tirages (la réponse fabriquée doit être juste : l'équation est vérifiée, la
conversion recalculée, les propositions d'un QCM sont toutes différentes).

## Catalogue du premier lot

| Famille     | Générateurs                                                                                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Calcul      | `fractions.simplify`, `fractions.add`, `fractions.multiply`, `fractions.divide`, `fractions.compare`, `powers.compute`, `powers.rules`, `powers.scientific`, `numbers.priority`, `percent.apply` |
| Algèbre     | `equations.linear` (ax + b = c), `equations.both_sides` (ax + b = cx + d), `algebra.expand`, `algebra.identities`, `algebra.factor`                                       |
| Géométrie   | `geometry.perimeter`, `geometry.area`, `geometry.volume`, `geometry.pythagoras` (arrondi demandé quand π ou une racine intervient)                                        |
| Conversions | `units.length`, `units.mass`, `units.capacity`, `units.area`, `units.volume` (m³, dm³, L…), `units.duration`                                                             |

La difficulté (1 à 3) règle la taille des nombres et les cas (négatifs, fractions, décimaux).
Les `params` sont facultatifs et documentés dans le prompt (ex. `units.length` :
`{ "units": ["km", "m"] }`) ; un paramètre inconnu est ignoré.

## Réponses

- Nombres écrits en notation décimale française (« 0,0035 », jamais « 3.5e-3 »).
- La correction accepte en plus : espaces dans les nombres (« 3 500 »), « x = 2 » pour une
  équation.
- Arrondis : l'énoncé dit « arrondi au dixième » et la réponse attendue est la valeur arrondie.

## Format, prompt, import

- L'import refuse un nom de générateur absent du catalogue (message français).
- Le prompt liste les générateurs du niveau de la fiche (et leurs `params`) et demande d'en
  ajouter un par point-clé qui s'y prête, sans inventer de nom.
- L'exemple de maths gagne quelques générateurs.

## Lecteur

- Série : exercices écrits d'abord (tirage actuel), puis questions générées jusqu'à 10, les
  générateurs pris à tour de rôle, sans répéter une question déjà posée quand c'est possible.
- Défi : réserve = exercices rapides écrits + générateurs (chaque passage sur un générateur
  fabrique une nouvelle question) ; le défi est possible dès qu'il y a un générateur.
- Une question générée a pour id `<id du générateur>~<n>` (historique `attempts` compris).

## Réalisé (2026-11-25)

25 générateurs dans `src/lib/generators/` (un fichier par famille), branchés dans les séries et
le défi (`src/lib/practice/generated.ts`). Écarté pour plus tard : un exemple de question générée
dans l'aperçu d'import, une saisie d'expression pour développer et factoriser.
