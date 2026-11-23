# PocketClass — Phase 1 : squelette, import de parcours, carte et fiche

Tu travailles dans le dépôt `pocketclass` (vide à part `README.md`). Le projet Firebase `pocketclass` existe déjà (Firestore en région UE, Auth Google et Anonyme activés, Hosting activé). Je développe sous Windows avec VS Code.

Lis tout ce document avant de commencer. Propose-moi ton plan en quelques lignes, puis enchaîne sans attendre sauf blocage réel.

---

## 0. Langue — règle absolue

- **Tout le code est en anglais** : fichiers, fonctions, variables, types, **noms de collections et de champs Firestore**, **clés et valeurs d'énumération des formats JSON**, routes et commentaires.
- **Seul le texte affiché à l'utilisateur est en français** : libellés, messages, erreurs de validation montrées dans l'UI, manifest de la PWA. Centralise ces textes dans `src/lib/i18n/fr.ts` (un simple objet, sans bibliothèque d'i18n).
- Le **contenu** des fiches et exercices (les valeurs des champs texte) est en français, puisque c'est du contenu scolaire.

## 1. Le produit en bref

PocketClass est une PWA familiale de révision pour deux collégiens, un en 3e (brevet) et un en 6e. C'est un **recueil de fiches de révision** organisé ainsi : **subject, puis path, puis topic, puis concept**. Un concept contient :

- **3 à 6 key points** : c'est le fil rouge, tout s'y rattache ;
- une **study sheet** : sections courtes avec la règle, des exemples et les pièges ;
- des **exercices de practice**, illimités et non comptés ;
- un **assessment** : type brevet ou type contrôle. C'est le seul qui rapporte des points (en phase 3) ;
- un **summary** : l'enfant écrit sur papier ce qu'il a compris, une IA externe le vérifie à partir d'une photo, puis le résultat est importé en JSON (en phase 4).

Le contenu est surtout produit par une **IA externe** : le parent colle un prompt dans l'IA de son choix, récupère un JSON et le colle dans l'app. **L'app n'appelle jamais d'API d'IA.**

Le parent utilise son propre téléphone, chaque enfant aussi.

## 2. Stack (validée, ne pas en changer)

- **SvelteKit + Svelte 5 (runes)**, **TypeScript** strict, **Vite**.
- `@sveltejs/adapter-static` en **SPA** : `fallback: 'index.html'`, `ssr = false` et `prerender = false` dans le `+layout.ts` racine.
- **PWA** avec `@vite-pwa/sveltekit` : manifest en français, icônes provisoires générées, mise en cache de l'app shell, installable sur iPhone.
- **Firebase JS SDK (modulaire)** : Firestore avec `initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) })`, Auth et Hosting.
- **Zod** pour tous les formats JSON. Les types TypeScript viennent de `z.infer`, et le JSON Schema est exporté avec `z.toJSONSchema` (Zod 4).
- **KaTeX** pour les maths dans les fiches.
- **marked** et **DOMPurify** pour le Markdown des fiches. **Le contenu vient d'une IA externe : il doit toujours être assaini avant `{@html}`.**
- **Vitest** pour les tests.
- **Firebase Emulator Suite** (Firestore et Auth) pour le développement local. L'app s'y connecte automatiquement en `dev` si `PUBLIC_USE_EMULATORS=true`.
- CSS simple avec des variables CSS, mobile d'abord. Pas de Tailwind.

Utilise les dernières versions stables, et vérifie les API au moment de l'installation (notamment Zod 4, Svelte 5 et Firebase v11 ou plus).

### Décisions techniques prises à l'installation (23 nov. 2026)

Versions installées : SvelteKit 3.4, Svelte 5.59, Vite 8, TypeScript 6, Vitest 5, Firebase 13.4, Zod 4.6, `@vite-pwa/sveltekit` 2.0.

- **Node 24** (`.nvmrc`) : Firebase 13 exige Node ≥ 24.12. Lancer `nvm use 24` avant les commandes npm.
- **Pas de `svelte.config.js`** : dans SvelteKit 3, la config de Kit (adapter, etc.) est passée à `sveltekit({...})` dans `vite.config.ts`.
- **`$lib` est supprimé** dans SvelteKit 3. On utilise l'import de sous-chemin `#lib/*` **avec l'extension** : `import { fr } from '#lib/i18n/fr.ts'`.
- **`$env/static/public` est déprécié** : les variables sont déclarées dans `src/env.ts` (`defineEnvVars`, `public: true, static: true`) et importées depuis `$app/env/public`. Le préfixe `PUBLIC_FIREBASE_*` est conservé. `dev` vient de `$app/env`.
- **Scripts d'installation** refusés (`allowScripts` dans `package.json`) pour `@firebase/util` et `protobufjs` : inutiles ici.
- **Fins de ligne** : `.gitattributes` force `eol=lf` (cohérent avec Prettier sous Windows). `docs/` est exclu de Prettier.
- **Git** : le travail de la phase 1 se fait sur la branche `feat/phase-1`.
- Id du projet Firebase : `pocketclass-bd866`.
- **Premier login parent** : écritures séquentielles (famille → profil admin → `users/{uid}`) et non un `writeBatch`, car les règles vérifient `admins` avec `get()`, qui ne voit que les données déjà écrites.
- **En-têtes de cache Hosting** : deux règles disjointes (regex `no-cache` pour `index.html`, les routes SPA, le service worker et le manifest ; `immutable` pour `/_app/immutable/**`). L'emulator Hosting ignore les en-têtes personnalisés : à vérifier avec `curl -I` après le premier déploiement.

### Conventions

- Dans le code TypeScript, les champs sont en `camelCase`. Les valeurs d'énumération et les ids de contenu sont en `snake_case` ou en slug.
- La config Firebase passe par des variables `PUBLIC_FIREBASE_*` (déclarées dans `src/env.ts`, importées depuis `$app/env/public` : voir les décisions ci-dessus). Crée un `.env.example`, ajoute `.env.local` à `.gitignore` et documente-le dans le README.
- Crée un **`CLAUDE.md`** à la racine qui résume ce document : produit, stack, règle de langue, modèle de données, commandes. C'est la mémoire du projet pour les sessions suivantes.

## 3. Modèle Firestore

```
users/{uid}                                  { familyId, profileId }        ← index pour retrouver sa famille
families/{familyId}                          { name, admins: [uid], createdAt }
  devices/{uid}                              { profileId, linkedAt }        ← appareils liés (enfants, phase 5)
  profiles/{profileId}                       { firstName, role: "admin"|"child", grade, points }
  subjects/{subjectId}                       { name, color }
  paths/{pathId}                             { subjectId, title, grade, type: "brevet"|"test"|"lessons",
                                               topics: [{ id, title, order }], source, version, updatedAt }
  concepts/{conceptId}                       { pathId, subjectId, topicId, title, order, prerequisites: [id],
                                               keyPoints: [{ id, label }],
                                               sheet: { sections: [...], pitfalls: [string] },
                                               summaryInstruction, archived: false }
  concepts/{conceptId}/exercises/{exerciseId} { usage, type, keyPoint, difficulty, content, archived: false }
  assessments/{assessmentId}                 { conceptIds, type, draw?, exerciseIds?, paper?, scoring }
  profiles/{profileId}/assignments/{pathId}      { since, dueDate? }
  profiles/{profileId}/progress/{conceptId}      (phase 2)
  profiles/{profileId}/attempts/{id}             (phase 2, ajout seulement)
  profiles/{profileId}/summaries/{id}            (phase 4)
  profiles/{profileId}/pointsLedger/{id}         (phase 3, ajout seulement)
```

Principes :

- Le **catalogue** (subjects, paths, concepts, exercises, assessments) appartient à la famille. La **progression** appartient au profil.
- **Ids stables issus de l'import.** L'id Firestore d'un concept est l'id du JSON (unique, ex. `maths-3e-fractions`). L'id d'un exercice est son id JSON, unique au sein de son concept.
- **Un réimport est un upsert.** `version` s'incrémente. Un exercice ou un concept absent du nouveau JSON passe à `archived: true` : on ne supprime jamais rien.
- Les écritures se font par **lots (`writeBatch`) de 450 opérations au maximum**.

## 4. Formats JSON (Zod) — `src/lib/schemas/`

### `pocketclass/path@1`

```ts
Path = {
  format: "pocketclass/path@1",
  id: slug, subject: string, title: string, grade: string,
  type: "brevet"|"test"|"lessons", version: int ≥ 1,
  topics: [{ id: slug, title: string }]  (≥1),
  concepts: [Concept] (≥1),
  warnings?: string[]
}
Concept = {
  id: slug, topic: string (doit exister dans topics), title, prerequisites: string[] = [],
  keyPoints: [{ id: slug, label }] (1 à 8, ids uniques),
  sheet: {
    sections: [{ title, text (Markdown + KaTeX $…$ / $$…$$), examples: [{ statement, solution }] = [],
                 keyPoints: string[] (ids existants) }] (≥1),
    pitfalls: string[] = []
  },
  summaryInstruction?: string,
  exercises: [Exercise],
  assessment?: { type: "brevet"|"test", draw?: { perKeyPoint: int }, exerciseIds?: string[],
                 paper?: { instruction, rubric: [{ keyPoint, criterion }] } }
}
Exercise = base { id, usage: "practice"|"assessment", keyPoint (id existant), difficulty: 1|2|3 = 1 }
  + union discriminée sur `type` :
  pair        { front, back, direction: "front_to_back"|"both" = "front_to_back" }
  mcq         { question, answer, distractors: string[3] }
  calculation { statement, answer, requireIrreducible?: boolean }   // réponse : nombre ou fraction "a/b"
  cloze       { text }                                              // la réponse entre [[ ]] : "Nous [[mangeons]]."
  ordering    { instruction, items: string[] (≥2, dans le bon ordre) }
  open        { question, answers: string[] (≥1) }
  paper       { instruction, answer?, answerFormat?: "number"|"fraction"|"text"|"none" }
  generator   { generator: string, params: Record<string, unknown> = {} }
```

Ajoute des **validations croisées** (`superRefine`) :

- les références `topic`, `keyPoint`, `exerciseIds` et les `keyPoints` des sections doivent exister ;
- les ids doivent être uniques ;
- chaque `[[…]]` de `cloze` doit être non vide.

Les **messages d'erreur affichés sont en français**, avec le chemin du champ (ex. `concepts[0].exercises[3].keyPoint : « kp-xyz » n'existe pas dans keyPoints`). Utilise une `errorMap` ou une fonction de formatage dédiée.

### `pocketclass/lesson@1` (une leçon à partir d'une photo du cahier)

```ts
{ format: "pocketclass/lesson@1", subject, title, grade, dueDate?: "YYYY-MM-DD",
  exercises: [Exercise sans id, usage ni keyPoint obligatoires], warnings?: string[] }
```

Écris le schéma et ses tests. **Pas encore d'import** de ce format en phase 1.

### `pocketclass/summary@1` (évaluation du résumé par l'IA)

```ts
{ format: "pocketclass/summary@1", conceptId, code: string, legible: boolean, transcription: string,
  keyPoints: [{ id, status: "acquired"|"partial"|"missing"|"wrong", comment: string = "" }],
  errors: [{ excerpt, correction }] = [], score?: { acquired, total }, advice: string }
```

Écris le schéma et ses tests. Pas encore d'UI en phase 1.

Ajoute un script `npm run schemas` qui exporte les trois JSON Schema dans `static/schemas/*.json`.

**Tolérance à l'import :** avant `JSON.parse`, retire un éventuel bloc de code Markdown (une ligne de trois backticks suivie ou non de `json`, puis la ligne de fermeture), ainsi que les espaces et le texte autour du premier `{` et du dernier `}`.

## 5. Données d'exemple — `static/samples/maths-3e-brevet.json`

Écris un parcours `path@1` **valide** :

- `id: "maths-3e-brevet"`, titre « Mission Brevet — Maths », grade `3e`, type `brevet` ;
- topics : `numbers` (« Nombres et calculs »), `geometry` (« Géométrie »), `functions` (« Fonctions »).

Il contient **un concept complet**, `maths-3e-fractions` (topic `numbers`) :

- key points `kp-simplify`, `kp-add` (même dénominateur), `kp-multiply`, `kp-divide` (× l'inverse), `kp-irreducible` ;
- une fiche de 4 sections en français, avec des exemples en KaTeX (ex. `$\frac{12}{18} = \frac{2}{3}$`) et le piège « toujours donner une fraction irréductible » ;
- au moins **12 exercices fixes**, répartis sur tous les key points et sur les usages `practice` et `assessment` : types `calculation`, `mcq`, `cloze`, et un `paper` (petit problème type brevet) ;
- un `assessment` de type `brevet` avec `draw.perKeyPoint = 2` et une grille `paper.rubric`.

Ajoute aussi **deux concepts courts** (`maths-3e-powers` dans `numbers`, `maths-3e-pythagoras` dans `geometry`) : 3 key points, 2 sections et 4 exercices chacun, pour que la carte ait de la matière.

**Exactitude :** un test Vitest recalcule chaque exercice `calculation` de l'exemple avec une petite lib de fractions (`src/lib/math/fraction.ts` : parse, simplify, opérations, égalité, irréductibilité). Le test échoue si une réponse est fausse, ou si elle n'est pas irréductible alors que `requireIrreducible` vaut true.

## 6. Fonctionnalités de la phase 1

1. **Connexion parent** avec Google.
   - Premier login : création de `families/{id}` (admins = [uid]), du profil admin et de `users/{uid}`.
   - Écran simple pour **créer les profils enfants** (prénom, niveau). Pas encore de liaison d'appareil.
2. **Import d'un parcours** (`/parent/import`) :
   - zone de collage, plus un bouton « Charger l'exemple » qui lit `static/samples/maths-3e-brevet.json` ;
   - validation Zod, puis **aperçu** : topics, nombre de concepts et d'exercices par concept, warnings, et erreurs lisibles le cas échéant ;
   - bouton **Importer** : upsert par lots, archivage des éléments disparus, création du subject si absent ;
   - choix des profils auxquels **affecter** le parcours (`assignments`).
3. **Carte du parcours** (`/path/[id]`) : les topics en sections, les concepts sous forme de nœuds sur un chemin vertical (style « carte de mission »), dans l'ordre. Pour l'instant, chaque nœud indique seulement « à faire ».
4. **Fiche** (`/concept/[id]`) :
   - sections en Markdown assaini, avec KaTeX ;
   - exemples repliables (énoncé, puis solution) et pièges mis en avant ;
   - liste des key points ;
   - boutons « S'entraîner » et « Contrôle » désactivés, avec la mention « bientôt ».
5. **Accueil** (`/`) : selon le rôle, le parent voit l'import et les profils ; tout le monde voit les parcours affectés.
6. **Hors-ligne** : une fois une fiche ouverte, elle reste consultable sans réseau (cache Firestore et service worker). Affiche un petit indicateur « Hors-ligne ».

## 7. Firebase : configuration et règles

- `firebase.json` :
  - Hosting : `public: "build"`, ou le dossier de sortie réel de l'adapter, à vérifier ;
  - réécriture SPA vers `/index.html` ;
  - en-têtes de cache : `immutable` pour `/_app/immutable/**`, `no-cache` pour `index.html` et le service worker ;
  - Firestore : `firestore.rules` et `firestore.indexes.json` ;
  - emulators pour Auth, Firestore et l'UI.
- `.firebaserc` avec le projet `pocketclass`. **Demande-moi l'id exact du projet** si tu ne le trouves pas.
- `firestore.rules` (première version) :
  - un utilisateur lit et crée **son** `users/{uid}` ;
  - **admin d'une famille** : `request.auth.uid in get(families/{fid}).data.admins` donne lecture et écriture sur tout ce qui est sous `families/{fid}` ;
  - **membre d'une famille** (admin, ou `exists(families/{fid}/devices/{uid})`) : lecture du catalogue (subjects, paths, concepts, exercises, assessments) et de son profil ;
  - création d'une famille autorisée si `admins == [request.auth.uid]` ;
  - tout le reste est refusé par défaut. Commente les règles (en anglais).
- Scripts npm :
  - `dev` (avec les emulators via `firebase emulators:start` dans un second terminal, documenté dans le README) ;
  - `build`, `preview`, `check`, `test`, `schemas` ;
  - `deploy` (`npm run build && firebase deploy`).

## 8. Structure suggérée

```
src/lib/firebase.ts                 init, emulators, cache persistant
src/lib/auth.svelte.ts              état d'auth (runes), famille et profil courants
src/lib/i18n/fr.ts                  tous les textes de l'UI
src/lib/schemas/{path,lesson,summary,common,errors}.ts
src/lib/import/parseJsonLoose.ts
src/lib/import/importPath.ts        upsert par lots et archivage
src/lib/math/fraction.ts
src/lib/render/markdown.ts          marked + KaTeX + DOMPurify
src/lib/data/*.ts                   lectures Firestore typées
src/routes/+layout.ts|svelte, +page.svelte, parent/import, parent/profiles, path/[id], concept/[id]
static/samples/maths-3e-brevet.json, static/schemas/
*.test.ts à côté des fichiers testés
```

## 9. Critères de fin de phase 1

- [ ] `npm run check`, `npm run test` et `npm run build` passent sans erreur.
- [ ] Avec les emulators : connexion Google (émulée), création de la famille et de 2 profils enfants, import de l'exemple, affectation à un profil, affichage de la carte et de la fiche Fractions (KaTeX bien rendu).
- [ ] Réimporter le même fichier avec `version: 2` et un exercice en moins : l'exercice passe en `archived: true`, sans doublon.
- [ ] Coller un JSON invalide affiche des erreurs lisibles en français.
- [ ] Hors-ligne (DevTools → Offline), une fiche déjà ouverte reste consultable.
- [ ] L'app est installable (manifest et service worker valides).
- [ ] Aucun identifiant, nom de champ ou valeur d'énumération en français dans le code (`grep` rapide pour vérifier).
- [ ] `CLAUDE.md` et `README.md` sont à jour : installation, `.env.local`, emulators, déploiement.

Fais des **commits atomiques** avec des messages clairs (en anglais, format conventional commits) : 1. squelette, 2. Firebase, 3. schémas et tests, 4. exemple, 5. import, 6. carte et fiche, 7. PWA. **Ne fais pas `firebase deploy` toi-même** : dis-moi quand c'est prêt.

## 10. Hors périmètre (phases suivantes, ne pas coder maintenant)

- Phase 2 : practice (moteur d'exercices, générateurs `fractions.*`, vérification des réponses en valeur), `attempts` et `progress`.
- Phase 3 : assessments, barème (5 points par bonne réponse, +15 si sans-faute ; rejouer ne rapporte que l'amélioration), `pointsLedger`.
- Phase 4 : summary par photo (prompt copié, import `summary@1`, validation par le parent).
- Phase 5 : liaison des téléphones enfants par QR code et PIN (Auth anonyme et `devices/{uid}`), règles côté enfant.
- Phase 6 : révision espacée, prompts IA dans l'app (copier le prompt), saisie rapide de leçons (`lesson@1`).

Garde l'architecture prête pour ces phases, sans les implémenter.

# PocketClass — Nommage en anglais (décision du 23 nov. 2026)

**Règle :** tout le code est en anglais, y compris les noms de collections et de champs Firestore, et les clés et valeurs d'énumération des formats JSON. Seul le texte de l'UI est en français. Le contenu scolaire (textes des fiches et des exercices) reste en français.

Les documents « architecture-donnees » et « cadrage » utilisent encore les termes français. **Les noms anglais ci-dessous font foi.** Le prompt « PocketClass-prompt-claude-code-phase1.md » est la référence exacte des schémas.

## Correspondance

| Français (docs)                                                                   | Anglais (code)                                                                     |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| utilisateurs / familles / appareils / profils                                     | users / families / devices / profiles                                              |
| prenom, role admin/enfant, niveau                                                 | firstName, role admin/child, grade                                                 |
| matières                                                                          | subjects                                                                           |
| parcours (type brevet / controle / lecons)                                        | paths (type brevet / test / lessons)                                               |
| thème                                                                             | topic                                                                              |
| notion                                                                            | concept                                                                            |
| point-clé (id, intitulé)                                                          | keyPoint (id, label)                                                               |
| fiche (sections, exemples, pièges)                                                | sheet (sections, examples, pitfalls)                                               |
| section (titre, texte) / exemple (énoncé, solution)                               | section (title, text) / example (statement, solution)                              |
| prérequis, ordre, archivé, consigneResume                                         | prerequisites, order, archived, summaryInstruction                                 |
| exercice (usage entraînement/contrôle, difficulté)                                | exercise (usage practice/assessment, difficulty)                                   |
| types paire / qcm / calcul / trous / ordre / ouverte / papier / générateur        | pair / mcq / calculation / cloze / ordering / open / paper / generator             |
| recto, verso, sens                                                                | front, back, direction (front_to_back / both)                                      |
| réponse(s), distracteurs, énoncé, consigne, éléments                              | answer(s), distractors, statement, instruction, items                              |
| formeIrreductible, formatReponse                                                  | requireIrreducible, answerFormat                                                   |
| contrôle (tirage parPointCle, papier, grille, critère, barème)                    | assessment (draw perKeyPoint, paper, rubric, criterion, scoring)                   |
| affectations (depuis, échéance)                                                   | assignments (since, dueDate)                                                       |
| progression / tentatives / résumés / mouvementsPoints                             | progress / attempts / summaries / pointsLedger                                     |
| alertes                                                                           | warnings                                                                           |
| résumé : lisible, statut acquis/partiel/absent/erreur, erreurs (extrait), conseil | summary : legible, status acquired/partial/missing/wrong, errors (excerpt), advice |

## Formats JSON (versions remises à 1 après le renommage)

- `pocketclass/path@1` (anciennement `parcours@2`)
- `pocketclass/lesson@1` (anciennement `lecon@1`)
- `pocketclass/summary@1` (anciennement `resume@1`)

Les **prompts donnés à l'IA externe** devront utiliser ces noms anglais dans le format demandé. Les consignes peuvent rester en français.
