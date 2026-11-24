# Mode test enfant et page « Mes fiches vues » — design

Date : 24 novembre 2026. Statut : en attente de validation.

## Intention

1. **Mode test enfant.** Le parent (administrateur) doit toujours pouvoir voir et utiliser
   l'app comme un enfant, pour vérifier ce qu'il construit ou importe. Règle permanente : toute
   fonction côté enfant, présente ou future (entraînement, contrôles, points…), doit marcher
   dans ce mode.
2. **Mes fiches vues.** L'enfant retrouve les fiches qu'il a déjà ouvertes, par une recherche,
   un filtre par matière, ou un tirage au hasard pour réviser.

Le mode test passe en premier : la page des fiches vues sera la première testée avec lui.

## Objectifs, non-objectifs, anti-objectifs

- **Objectifs** : le parent voit le classeur d'un enfant choisi (mêmes matières) et peut tout
  faire comme lui (ouvrir, marquer lue, écrire une remarque) ; il remet ses données de test à
  zéro quand il veut. L'enfant a une page de fiches vues avec recherche, pastilles de matière
  et tirage au hasard.
- **Non-objectifs** : voir la vraie progression d'un enfant en mode test (elle reste sur sa
  page profil côté parent) ; les tags (ils demandent de changer le format des fiches, autre
  idée du backlog) ; un mode test sans enfant existant.
- **Anti-objectifs** (un échec même si « ça marche ») : une action du parent en mode test qui
  modifie les données d'un vrai enfant (progression, remarques, plus tard points) ; une page
  enfant qui ne marche plus pour un vrai enfant ; des remarques de test qui apparaissent dans
  « Remarques des enfants ».

## Contraintes

- Architecture en couches de `CLAUDE.md` : logique pure testée (Vitest) + exécuteurs minces
  dans `data/` ; les routes n'importent pas Firebase ; textes en français dans `fr.ts`.
- Lectures cache-first et écritures `inBackground()` : le mode test marche hors ligne comme le
  mode enfant (sauf la remise à zéro, qui supprime des documents : en ligne, attendue).
- Règles Firestore : l'admin lit et écrit déjà tout sous sa famille (`match /{document=**}`).
  Aucune règle à changer.

## Approches envisagées (mode test)

| Option | Où vont les actions du parent | Retenue ? |
| --- | --- | --- |
| **A. Ses propres données** : classeur d'un enfant choisi, progression et remarques dans le profil du parent, remise à zéro | Profil du parent | **Oui (choix de l'utilisateur)** : aucun risque pour le suivi des enfants |
| B. À la place d'un enfant : son écran, sa vraie progression | Données de l'enfant | Non : fausse son suivi (fiches plus « nouvelles », remarques à son nom) |
| C. Comme un enfant, en lecture seule | Nulle part | Non : impossible de tester « lue », les remarques, l'entraînement |

## Design — mode test enfant

### Le principe : une « vue enfant »

Aujourd'hui `session.isChild` (rôle du compte) décide de l'interface, et `session.childId`
donne le profil dont on lit la progression. On les remplace par une seule notion :

```ts
// src/lib/profile/childView.ts (pur, testé)
export interface ChildView {
	/** Profil dont on lit et écrit la progression et les remarques. */
	ownerId: string;
	/** Ce qui décide des matières visibles : celles de l'enfant (vrai ou imité). */
	grade: Grade | null;
	extraSubjects: string[];
	/** Prénom affiché (« Bonjour … »). */
	name: string;
	/** Vrai quand c'est le parent qui teste. */
	testing: boolean;
}

export function childViewOf(
	profile: WithId<Profile> | null,
	testChild: WithId<Profile> | null
): ChildView | null;
// enfant connecté → sa propre vue ; admin + enfant imité → vue de l'enfant, ownerId = admin ;
// sinon null.
```

Dans `session` (`auth.svelte.ts`) :

- `testChildId = $state<string | null>` : l'enfant imité, mémorisé dans le `localStorage` de
  l'appareil (clé `pocketclass.testChild`, lecture et écriture dans un `try/catch`) ;
- le profil de cet enfant est suivi en direct (`watchProfile`), comme celui du compte ;
- `childView = $derived(childViewOf(this.profile, testChildProfile))` ;
- `startTest(childId)` / `stopTest()` ; si l'enfant imité est supprimé ou introuvable, le mode
  test s'arrête tout seul ;
- `isChild` reste le **rôle réel** (utilisé seulement là où c'est vraiment un téléphone
  enfant : « Délier cet appareil » sur `/me`) ; `childId` disparaît.

### Ce qui change dans les pages

| Où | Avant | Après |
| --- | --- | --- |
| Accueil `/` | `isChild` → classeur enfant, lien remarques | `childView` → idem ; en test, la section parent est masquée |
| Matière, chapitre, fiche | `isChild` / `childId` | `childView` / `childView.ownerId` ; le badge de niveau compare à `childView.grade` |
| `SubjectCards` | prop `profile` (matières + progression) | props séparées : `view` (niveau, matières en plus) et `ownerId` (progression). La page d'un enfant côté parent passe l'enfant pour les deux ; l'accueil parent n'en passe aucune |
| `/me/notes` | `session.profileId` | `childView.ownerId` |
| `/me` | « Délier cet appareil » si `isChild` | inchangé (rôle réel) |

### Entrer, sortir, remettre à zéro

- **Entrer** : bouton « Tester comme {prénom} » sur la page de l'enfant
  (`/parent/profiles/[id]`), qui lance le mode test et ramène à l'accueil.
- **Bandeau** sous l'en-tête, sur toutes les pages tant que le mode test est actif :
  « Mode test : classeur de {prénom} · Remettre à zéro · Quitter ».
- **Remettre à zéro** : supprime la progression et les remarques du profil du parent
  (`resetTestData(familyId, adminId)` dans `data/`, avec `deleteInBatches`), en ligne, avec
  confirmation simple (`confirm`). Plus tard : tentatives et points du parent aussi.
- **Quitter** : arrête le mode test et revient à l'accueil parent. Les données de test restent
  (on peut reprendre plus tard) jusqu'à la remise à zéro.

### Pourquoi c'est sûr

- Toutes les écritures passent par `childView.ownerId`, qui vaut l'id du parent en test.
- « Remarques des enfants » ne liste que les profils enfants (`watchChildProfiles`) : les
  remarques de test n'y apparaissent pas.
- Un vrai enfant obtient exactement la même vue qu'aujourd'hui (`ownerId` = son id).

## Design — page « Mes fiches vues »

- **Route** `/me/sheets`, affichée quand `childView` existe (enfant ou parent en test) ; lien
  sur l'accueil enfant, à côté de « Mes remarques » : « Mes fiches vues (N) ».
- **Données** : `watchBinder(familyId, ownerId)` (déjà utilisé par l'accueil).
- **Logique pure** `src/lib/binder/seen.ts` (testée) :
  - `seenSheets(binder, view)` : fiches ouvertes au moins une fois (`progress` présent), dans
    une matière visible (`visibleSubjects`) et un chapitre actif (`reachableSheets`), avec
    leur matière, leur chapitre et leur état (`sheetState`) ; triées par `openedAt`
    décroissant (une date en attente, `null`, compte comme « maintenant ») ;
  - `normalize(text)` : minuscules, sans accents (`NFD` + suppression des diacritiques) ;
  - `filterSeen(entries, query, subjectId)` : chaque mot de la recherche doit apparaître dans
    le titre de la fiche, le nom de la matière ou le titre du chapitre ; `subjectId` null =
    toutes les matières. Le texte cherché est construit par une fonction `searchText(entry)`
    pour que les tags s'y ajoutent plus tard ;
  - `pickRandom(entries, random = Math.random)` : une entrée au hasard, ou null.
- **Écran** :

  ```
  ← Accueil
  Mes fiches vues                     [Au hasard]
  [ Rechercher…                                  ]
  (Toutes) (Maths) (Français) (Histoire)
  ┌──────────────────────────────────────────────┐
  │ ● Maths · Fractions                  [Lue]    │
  │ Additionner des fractions                     │
  └──────────────────────────────────────────────┘
  ```

  Pastilles = matières présentes dans les fiches vues (pas toutes les matières), en `badge` /
  `btn btn-sm` de la couleur de la matière ; recherche = `input` de type `search` ; « Au hasard »
  ouvre une fiche tirée parmi les résultats affichés (désactivé s'il n'y en a aucun). États
  vides : « Tu n'as encore ouvert aucune fiche » et « Aucune fiche ne correspond ».
  Titres rendus avec `renderInline` (KaTeX) ; état avec `SheetStateBadge`.

## Tests

- Vitest : `childViewOf` (enfant, admin sans test, admin en test, enfant imité sans niveau),
  `seenSheets`, `normalize`, `filterSeen`, `pickRandom` (avec un `random` injecté).
- Règles : un cas « l'admin écrit et supprime la progression de son propre profil » (déjà
  permis, on le fige dans `tests/rules`).
- Vérification manuelle (emulators) : un parent teste comme un enfant, ouvre et marque une
  fiche, écrit une remarque ; la page de l'enfant côté parent ne montre rien de nouveau ; la
  remise à zéro vide la progression de test ; un vrai enfant voit son classeur comme avant.

## Documentation

- `CLAUDE.md` : convention « toute fonction enfant marche en mode test (`session.childView`,
  écrire avec `ownerId`) » ; entrée du journal des décisions ; liste des composants ; la ligne
  « Phase 3: an active profile… » de « To plan » est remplacée par cette décision.
- `docs/backlog.md` : « fiches déjà vues » passe dans « Ce qui est fait ».

## Laissé au choix de l'implémenteur

Nom exact des composants (`TestModeBanner`, page `/me/sheets`), style précis des pastilles et
du bandeau (dans les conventions daisyUI du projet), découpage des commits.

## Choix faits par Claude (à vérifier)

1. En test, « Bonjour » affiche le prénom de l'enfant imité, pour voir l'écran tel qu'il est.
2. En test, la section « Espace parent » de l'accueil est masquée ; les pages parent restent
   accessibles par leur adresse et par « Quitter ».
3. L'enfant imité est mémorisé par appareil (`localStorage`), pas dans Firestore.
4. La remise à zéro demande une simple confirmation, pas « SUPPRIMER » : ce ne sont que des
   données de test.
5. Pas de mode test sans enfant existant (il faut au moins un profil enfant à imiter).
