# PocketClass — project memory

Family revision PWA for two middle-schoolers (3e / brevet, and 6e). A collection of revision
sheets organised as **subject → path → topic → concept**. Full phase 1 brief:
[docs/prompt-claude-code-phase1.md](docs/prompt-claude-code-phase1.md) (the source of truth for schemas).

A concept has: 3–6 **key points** (the backbone, everything links to them), a **study sheet**
(sections + examples + pitfalls), unlimited **practice** exercises, one **assessment** (the only
thing that earns points, phase 3) and a **summary** written on paper and checked by an external AI
(phase 4).

Content is produced by an **external AI**: the parent pastes a prompt into any AI, gets JSON back,
pastes it into the app. **The app never calls an AI API.**

## Language rule (absolute)

- **All code is English**: files, functions, variables, types, Firestore collection and field
  names, JSON format keys and enum values, routes, comments.
- **Only user-facing text is French**, centralised in `src/lib/i18n/fr.ts` (plain object, no i18n
  library). Validation errors shown in the UI are French too (`src/lib/schemas/errors.ts`).
- Content values (sheets, exercises) are French school content.
- Fields are `camelCase`; enum values and content ids are `snake_case` or slugs.

## Stack

- SvelteKit **3** + Svelte 5 (runes), TypeScript strict, Vite 8, Node **24** (`.nvmrc`; firebase 13
  requires Node ≥ 24.12 — run `nvm use 24`).
- `@sveltejs/adapter-static` SPA (`fallback: 'index.html'`, `ssr = false`, `prerender = false`).
  Kit 3 has **no `svelte.config.js`**: Kit options live in `sveltekit({...})` in `vite.config.ts`.
- **Imports**: `$lib` was removed in Kit 3. Use the `#lib/*` subpath import **with the file
  extension**: `import { fr } from '#lib/i18n/fr.ts'`.
- **Env vars**: `$env/static/public` is deprecated in Kit 3. Variables are declared in
  `src/env.ts` (`defineEnvVars`) and imported from `$app/env/public`.
- PWA: `@vite-pwa/sveltekit`. Firebase JS SDK 13 (modular): Firestore with persistent multi-tab
  cache, Auth (Google), Hosting. Zod 4 for every JSON format (`z.infer` types, `z.toJSONSchema`).
  KaTeX + marked + DOMPurify for sheets (**always sanitise before `{@html}`**). Vitest.
- Plain CSS with variables (`src/app.css`), mobile first. No Tailwind.

## Technical decisions log

Keep this section, the brief in `docs/` and the README in sync whenever a technical decision is
made.

- 2026-11-23 — Node 24 (firebase 13 engines), SvelteKit 3 conventions (`#lib/*.ts`, `src/env.ts`,
  config in `vite.config.ts`).
- 2026-11-23 — Install scripts of `@firebase/util` and `protobufjs` denied (`allowScripts`).
- 2026-11-23 — `.gitattributes` forces LF; `docs/` excluded from Prettier.
- 2026-11-23 — Phase 1 work on branch `feat/phase-1`.
- 2026-11-23 — First parent login writes family → admin profile → `users/{uid}` **sequentially**
  (not a batch): rules check `admins` with `get()`, which only sees committed data.
- 2026-11-23 — Firestore refs centralised in `src/lib/data/refs.ts` (typed `DocumentReference`s);
  session state is a runes class in `src/lib/auth.svelte.ts` (`session.start()` in root layout).
- 2026-11-23 — Hosting cache headers use two **non-overlapping** rules (regex `no-cache` for
  index/SPA routes/SW/manifest, `immutable` for `/_app/immutable/**`). The Hosting emulator
  ignores custom headers: verify with `curl -I` after a real deploy.
- 2026-11-23 — Rules were checked against the emulators (two parents, 15 allow/deny cases).
- 2026-11-23 — Zod structural errors use Zod's built-in French locale, passed per call
  (`validate()` in `schemas/errors.ts`, no global `z.config`). Business messages (refs, slugs,
  cloze) live in `fr.validation`. Cross-checks (`superRefine`) only run once the structure is
  valid, so the user fixes structural errors first. Unknown keys are stripped (Zod default).
- 2026-11-23 — Exercise variants are defined once in `schemas/common.ts`; `path@1` and
  `lesson@1` build their unions from them with different common fields.
- 2026-11-23 — `npm run schemas` runs `scripts/export-schemas.ts` directly with Node 24 (native
  type stripping, no `tsx`). JSON Schemas use `io: 'input'` (fields with defaults are optional).
- 2026-11-23 — `src/lib/math/fraction.ts`: integer fractions; `parseFraction` keeps the written
  form (for irreducibility checks), operations return simplified results.
- 2026-11-23 — Sample `calculation` statements: the expression to compute is the **last `$…$`
  formula** (right-hand side if it contains `=`). `mathsSample.test.ts` evaluates it (LaTeX
  evaluator kept inside the test) and checks value + irreducibility. Keep this convention in
  the AI prompts (phase 6) if we want generated content to be auto-checkable.
- 2026-11-23 — Import split in two: `import/importPlan.ts` (pure `planImport(path, existing)` →
  write ops, unit-tested) and `import/importPath.ts` (reads existing state, runs the plan in
  `writeBatch` chunks of 450). Existing state only lists **active** items, so archiving counts
  are exact; a reappearing item is reactivated by its `set`.
- 2026-11-23 — Stored path `version = max(json.version, existing.version + 1)`.
- 2026-11-23 — Subject id = slug of the subject name (`Mathématiques` → `mathematiques`).
  Assessment id = concept id, with an extra `pathId` field (to find those to archive) and
  `scoring: { pointsPerCorrect: 5, perfectBonus: 15 }`. Exercise docs store type-specific
  fields under `content`.
- 2026-11-23 — Firestore initialised with `ignoreUndefinedProperties: true` (optional JSON
  fields). Pure modules usable in tests must not import `#lib/firebase.ts` (it needs
  `$app/env`); collection names live in `data/collections.ts`.
- 2026-11-23 — Static assets are typed in Kit 3: `asset('samples/x.json')` (no leading slash).
- 2026-11-23 — **Cache-first reads** (`data/live.ts`): pages use `onSnapshot` (`watchDoc`,
  `watchQuery`), which serves the IndexedDB cache immediately offline; `getDoc` would wait for
  the server first. One-shot reads use `getDocCacheFirst`, which confirms a cache miss with the
  server: the session never creates a family because a document is missing _from the cache_.
- 2026-11-23 — `render/markdown.ts`: math is cut out before marked (placeholders), rendered by
  KaTeX (`output: 'html'`), then the whole HTML goes through DOMPurify. Tests run in jsdom and
  check the DOM (no `<script>`, no `on*` attributes, no `javascript:` links).
- 2026-11-23 — Home: parents see every family path; children see their assigned paths.
  Concepts of a path are filtered (archived) and sorted client-side: no composite index.
- 2026-11-23 — Svelte effects that load data must depend on **primitives** (e.g. `pathId`), not
  on derived objects that change on every keystroke.
- 2026-11-23 — End-to-end check done with Playwright against the emulators (sign-in, family +
  2 children, invalid JSON errors, import + assignment, re-import v2 with one exercise less →
  archived, no duplicates, map, sheet with 24 KaTeX formulas, offline navigation).
- 2026-11-23 — PWA: `withPwa(kitOptions, pwaOptions)` replaces `sveltekit()` (key `strategies`),
  `generateSW` + `autoUpdate`, registered in the root layout (`virtual:pwa-register`). Manifest
  and icons are static links in `app.html`. `globStrict: false` (the plugin always adds an empty
  `prerendered/**`). Needs `magicast`. Placeholder icons generated once from `static/icon.svg`.
- 2026-11-23 — `npm run build:emulators` (mode `emulators`) = build wired to the emulators, to
  test the SW with `npm run preview`. `usingEmulators` is always false in mode `production`.

## Firestore model

```
users/{uid}                                    { familyId, profileId }
families/{familyId}                            { name, admins: [uid], createdAt }
  devices/{uid}                                { profileId, linkedAt }            (phase 5)
  profiles/{profileId}                         { firstName, role: admin|child, grade, points }
  subjects/{subjectId}                         { name, color }
  paths/{pathId}                               { subjectId, title, grade, type, topics[], source, version, updatedAt }
  concepts/{conceptId}                         { pathId, subjectId, topicId, title, order, prerequisites,
                                                 keyPoints, sheet, summaryInstruction, archived }
  concepts/{conceptId}/exercises/{exerciseId}  { usage, type, keyPoint, difficulty, content, archived }
  assessments/{assessmentId}                   { conceptIds, type, draw?, exerciseIds?, paper?, scoring }
  profiles/{profileId}/assignments/{pathId}    { since, dueDate? }
  profiles/{profileId}/progress|attempts|summaries|pointsLedger   (phases 2–4)
```

- Catalogue (subjects, paths, concepts, exercises, assessments) belongs to the family; progress
  belongs to the profile.
- Stable ids from the import: concept id = JSON id; exercise id = JSON id (unique per concept).
- Re-import = upsert, `version` increments, missing items get `archived: true`. **Never delete.**
- Writes go through `writeBatch`, max 450 operations per batch.

## JSON formats (`src/lib/schemas/`)

`pocketclass/path@1`, `pocketclass/lesson@1`, `pocketclass/summary@1`. JSON Schemas are exported
to `static/schemas/` by `npm run schemas`. Loose parsing (code fences, text around the JSON) in
`src/lib/import/parseJsonLoose.ts`.

## Commands

```
nvm use 24
npm run dev          # Vite dev server (set PUBLIC_USE_EMULATORS=true in .env.local)
npm run emulators    # Firebase Auth + Firestore emulators + UI (second terminal)
npm run check        # svelte-check
npm run test         # Vitest
npm run schemas      # export JSON Schemas to static/schemas/
npm run build        # static production build into build/
npm run build:emulators  # build wired to the emulators (PWA testing with npm run preview)
npm run deploy       # build + firebase deploy (the user runs it, never Claude)
```

Firebase project id: `pocketclass-bd866`.

## Roadmap

Phase 1 (done): skeleton, import, map, sheet. Phase 2: practice engine, `fractions.*`
generators, attempts/progress. Phase 3: assessments, scoring, pointsLedger. Phase 4: summary
photo flow. Phase 5: child device linking (QR + PIN, anonymous auth, `devices/{uid}`). Phase 6:
spaced repetition, in-app AI prompts, quick lesson entry (`lesson@1`).

## Git

Conventional Commits in English, short one-line messages, no attribution lines.
