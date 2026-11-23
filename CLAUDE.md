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
- **Tailwind 4 + daisyUI 5** (`@tailwindcss/vite`), mobile first. Two daisyUI themes from the logo in
  `src/app.css`: `pocketclass-light` (paper) and `pocketclass-dark` (slate, follows the phone).
  Fonts bundled with `@fontsource` (offline): Atkinson Hyperlegible (text), Permanent Marker
  (app name and `h1` only). Bits UI only if a complex interactive widget is ever needed.

## Architecture & conventions (how to add code)

Layers, from the outside in. A layer only imports from layers below it.

| Layer      | Where                                                                                             | Rules                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Routes     | `src/routes/**`                                                                                   | No `firebase/*` import, no refs or queries. Read data with `live(() => … && watchX(…))`, render states with `<LoadState>`. Parent pages go under `routes/parent/` (admin guard in its `+layout.svelte`).                                                                                                                                                                                     |
| Components | `src/lib/components/`                                                                             | Reusable UI: `LoadState`, `SessionGate` (+ `LinkDeviceForm`), `Avatar`, `ProfileLookForm`, `ProfileDashboard`, `NoteForm` / `NoteList` / `ProfileNotes`, `ConfirmDelete` (type « SUPPRIMER » before an irreversible deletion), `ChildDevices`. Components shared by the child and parent views take `familyId` / `profileId` props.                                                          |
| App state  | `auth.svelte.ts` (`session`), `online.svelte.ts` (`connectivity`)                                 | Runes singletons. `session.profile` is live; use `session.profileId` / `session.childId` (primitives) in `live()` sources; `isAdmin` / `isChild`.                                                                                                                                                                                                                                            |
| Data       | `src/lib/data/`                                                                                   | The only code touching Firestore. `refs.ts` builds every path (names in `collections.ts`). `sources.ts`: `Subscribe` sources (`docSource`, `querySource`) and cache-first one-shot reads (`firstSnapshot`, `getDocCacheFirst`). Domain sources are named `watchX` (`catalog.ts`, `family.ts`, `devices.ts`, `progress.ts`, `notes.ts`). Executors of pure plans live here (`importPath.ts`). |
| Pure logic | `schemas/`, `import/`, `math/`, `render/`, `i18n/`, `linking/`, `profile/`, `progress/`, `notes/` | No **runtime** Firebase import: unit-tested with Vitest. May import types from `data/types.ts` and names from `data/collections.ts` (both pure). Phase 2 practice engine goes here too (`src/lib/practice/`).                                                                                                                                                                                |

- **Pattern for Firestore features**: pure planner in a pure module (unit-tested) + thin
  executor in `data/` (e.g. `import/importPlan.ts` + `data/importPath.ts`). Keep it for
  attempts, points, summaries.
- **Reads are cache-first** (work offline), except deliberate online-only parent actions such as
  the import, which reads from the server (`data/importPath.ts`).
- **Live data in components**: `live()` (`data/live.svelte.ts`) resets on source change (in
  `$effect.pre`, so no frame shows stale data) and drops late results; sources must read
  **primitives** (ids), not objects that change on every keystroke. Name the live value
  `xLive` and the `<LoadState>` snippet parameter `x`. Async one-shot loads in effects need a
  `cancelled` flag in the cleanup; read non-trigger values with `untrack`.
- **Storage types** (`data/types.ts`) derive nested content from the Zod schemas; exercises are
  stored **flat** (`{ id, ...record }` is the `Exercise` again).
- **UI text** only in `fr.ts`; counts with `plural()`.
- **Styling**: daisyUI components + Tailwind utilities in the markup; theme colours only
  (`bg-base-100`, `text-primary`, `text-base-content/70`…), never raw hex. Patterns: block =
  `card card-border bg-base-100` + `card-body gap-3` + `card-title`; message = `alert alert-*
alert-soft` (`role="alert"` for errors); field = `label.fieldset` + `span.fieldset-legend` +
  `input|select|textarea w-full`; buttons `btn btn-primary|btn-ghost|btn-error`; tags `badge`.
  `main` is already a column with gaps (base layer). Project classes in `app.css`: `.prose`
  (Markdown + KaTeX), `.code-display`, `.doodles` (home and sign-in only, never behind a
  sheet). Avoid custom class names that daisyUI already uses (`.status`, `.label`, `.card`…).
- **Child writes** (progress, notes, profile look) go through `inBackground()` (`data/writes.ts`):
  not awaited, so they work offline (local cache first, live sources update at once).
  Parent actions that need the server (import, link code, unlink) are awaited and disabled
  offline.
- **Rules** change ⇒ add a case in `tests/rules/firestore.rules.test.ts` (`npm run test:rules`).

### To plan in later phases (not coded on purpose)

- Phase 2/3: attempts with `inBackground()` like progress (maybe show `hasPendingWrites`).
  Points: batch with deterministic ledger ids + `increment()` (transactions do not work
  offline). Notes on exercises: `NoteTarget.exerciseId` already exists.
- Phase 3: an "active profile" distinct from the signed-in one if a parent tests as a child.
- Device linking: a QR code was left out on purpose (on iOS a QR opens Safari, whose storage
  is separate from the installed PWA). Expired link codes are never deleted (harmless, could
  be cleaned by the parent later). Converting an anonymous account (`linkWithCredential`)
  would let a child sign in again on a new phone without a code.
- SW `autoUpdate`: add an update prompt once the data model changes between versions.

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
  ignores custom headers. Verified in production on 2026-11-23 (first deploy): OK.
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
  write ops, unit-tested) and `import/importPath.ts`, now `data/importPath.ts` (reads existing state, runs the plan in
  `writeBatch` chunks of 450). Existing state only lists **active** items, so archiving counts
  are exact; a reappearing item is reactivated by its `set`.
- 2026-11-23 — Stored path `version = max(json.version, existing.version + 1)`.
- 2026-11-23 — Subject id = slug of the subject name (`Mathématiques` → `mathematiques`).
  Assessment id = concept id, with an extra `pathId` field (to find those to archive) and
  `scoring: { pointsPerCorrect: 5, perfectBonus: 15 }`. (Exercise `content` sub-object: removed
  in the refactor below, exercises are flat.)
- 2026-11-23 — Firestore initialised with `ignoreUndefinedProperties: true` (optional JSON
  fields). Pure modules usable in tests must not import `#lib/firebase.ts` (it needs
  `$app/env`); collection names live in `data/collections.ts`.
- 2026-11-23 — Static assets are typed in Kit 3: `asset('samples/x.json')` (no leading slash).
- 2026-11-23 — **Cache-first reads** (now `data/sources.ts`): pages use `onSnapshot` (via `docSource` /
  `querySource` and `live()`), which serves the IndexedDB cache immediately offline; `getDoc` would wait for
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
  `prerendered/**`). Needs `magicast`. Icons: see the 2026-11-23 "App icons" entry.
- 2026-11-23 — `npm run build:emulators` (mode `emulators`) = build wired to the emulators, to
  test the SW with `npm run preview`. `usingEmulators` is always false in mode `production`.
- 2026-11-23 — Phase 1 merged into `main`; work continues on `main` (user's choice).
- 2026-11-23 — **Refactor after audit** (supersedes some entries above):
  - `watchDoc`/`watchQuery` replaced by `Subscribe` sources (`docSource`/`querySource`) +
    `live()` + `<LoadState>`; routes no longer import Firebase.
  - Exercises stored **flat** (no `content` sub-object). Existing data: re-import the path.
  - `nextVersion()` is the single version rule; path write flagged `touch` for `updatedAt`.
  - Import **blocked** when a concept id is owned by an active concept of another path
    (`findConceptConflicts`, `ImportConflictError`).
  - First login is idempotent: **family id = admin profile id = parent uid**
    (`ensureFamilyForUser`). Rules: a family can only be created with `familyId == uid`.
    Families created before (auto id) keep working through `users/{uid}`.
  - Session: run counter against overlapping auth events, `retry()`, `notLinked` status.
  - Firestore rules tests in the repo (`@firebase/rules-unit-testing`, `npm run test:rules`).
- 2026-11-23 — Final review follow-up: `data/live.ts` renamed `data/sources.ts`; `importPath.ts`
  moved to `data/` (only `data/` touches Firestore); `docSource`/`querySource` without casts;
  `live()` resets in `.pre`; map page wraps concepts in its own `<LoadState>`; import
  conflict check also keyed on the path id; 10 rules tests (incl. the real first-login order).

- 2026-11-23 — **Child accounts** (was phase 5): parents sign in with Google; a child phone
  signs in anonymously and is linked with a **one-time code** (6 chars, 10 min) created by the
  parent in `linkCodes/{code}` (top level). The link is one batch: `devices/{uid}` +
  `users/{uid}` + code deletion; rules check the code with `get()` and the index with
  `getAfter()`. No Cloud Function. Anonymous accounts cannot create a family. The child stays
  signed in (no sign-out button; "Unlink this device" on `/me`, which deletes the anonymous
  account); `navigator.storage.persist()` is requested at link time. Open listeners are not
  re-checked when access is revoked, so the child session watches its own `devices/{uid}`.
- 2026-11-23 — Admin = `families.admins` (rules) + `profile.role` (UI). Nothing to set up in
  the Firebase console.
- 2026-11-23 — Profile look: `nickname` (≤ 24) and `avatar` = data URL of a 128 px centre crop
  (WebP, JPEG fallback, ≤ 60 000 chars) stored in the profile: no Firebase Storage (Blaze plan).
  Children may only change these two fields (rules `affectedKeys().hasOnly`).
- 2026-11-23 — Progress: `progress/{conceptId}` = "I read this sheet" (children only). Child
  home = dashboard (read / total per assigned path, next unread concept in map order);
  the parent sees it on `/parent/profiles/[id]`.
- 2026-11-23 — Notes: `notes/{id}` written by the child (open), reviewed by the parent
  (seen / resolved); editing the text reopens it. Concept titles are resolved from the live
  catalogue (not copied into the note).
- 2026-11-23 — Review follow-up: the link batch must delete the code (`!existsAfter`), so a
  code links one device only. Rules tests use the project id `demo-pocketclass-rules`: they
  can run next to `npm run emulators` without wiping its data. Kit 3 wraps pages in a
  `<svelte:boundary>`: `src/routes/+error.svelte` shows a French error instead of a blank page.
- 2026-11-23 — Child profile deletion (parent, online): typed confirmation
  (`fr.common.confirmWord`, exact match) in the reusable `ConfirmDelete`. Deletes devices
  first, then assignments, progress, notes, then the profile (`deleteChildProfile`,
  `deleteInBatches` in `data/batches.ts`). An exception to "never delete", which is about the
  catalogue. Rules: a link code only links an existing **child** profile.
- 2026-11-23 — App icons: book + pencil-rocket **without the lettering**, one artwork per size
  range in `assets/` (square, background `#161b1c`): `icon-large.png` (splash circle → 512 and
  maskable 512 with 8 % padding), `icon-medium.png` (→ 192 and apple-touch 180),
  `icon-small.png` (rocket + book only → 64 and `favicon.ico` 48, a single-PNG ICO).
  `node scripts/make-images.mjs` writes them to `static/` (no `pwa-assets-generator` config any
  more; the package stays because it brings `sharp`). The current artworks were cut from a
  low-resolution sheet (large ≈ 284 px, upscaled to 512): to improve, replace
  `assets/icon-*.png` with HD squares and rerun the script.
- 2026-11-23 — UI: Tailwind 4 + daisyUI 5 replace the hand-written CSS (the "no Tailwind"
  line of the brief is lifted). Visual identity from the logo: slate header strip lettered
  "Pocket" chalk / "Class" mustard in both themes, mustard primary, cobalt secondary, chalk
  grain (`--noise`) in dark mode, faint maths doodles (SVG mask) on home and sign-in, full
  logo on the sign-in screen (`src/lib/assets/logo.webp`, 640 px, from `scripts/make-images.mjs`).
  The page background is base-200 through daisyUI's `--root-bg`.

## Firestore model

```
users/{uid}                                    { familyId, profileId }   (both = uid for new parents)
linkCodes/{code}                               { familyId, profileId, expiresAt }   (one-time device link code)
families/{familyId}                            { name, admins: [uid], createdAt }   (familyId = parent uid)
  devices/{uid}                                { profileId, code, linkedAt }      (child phone, anonymous uid)
  profiles/{profileId}                         { firstName, role: admin|child, grade, points, nickname?, avatar? }
  subjects/{subjectId}                         { name, color }
  paths/{pathId}                               { subjectId, title, grade, type, topics[], source, version, updatedAt }
  concepts/{conceptId}                         { pathId, subjectId, topicId, title, order, prerequisites,
                                                 keyPoints, sheet, summaryInstruction, archived }
  concepts/{conceptId}/exercises/{exerciseId}  { usage, type, keyPoint, difficulty, ...type fields, archived }
  assessments/{assessmentId}                   { pathId, conceptIds, type, draw?, exerciseIds?, paper?, scoring, archived }
  profiles/{profileId}/assignments/{pathId}    { since, dueDate? }
  profiles/{profileId}/progress/{conceptId}    { pathId, readAt }   (sheet read)
  profiles/{profileId}/notes/{noteId}          { conceptId, pathId, exerciseId, text, status: open|seen|resolved,
                                                 createdAt, updatedAt }
  profiles/{profileId}/attempts|summaries|pointsLedger   (phases 2–4)
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
npm run lint         # prettier --check (npm run format to fix)
npm run test         # Vitest unit tests (project "server")
npm run test:rules   # Firestore rules tests (reuses a running emulator, else starts one)
npm run schemas      # export JSON Schemas to static/schemas/
npm run build        # static production build into build/
npm run build:emulators  # build wired to the emulators (PWA testing with npm run preview)
npm run verify       # check + lint + test + test:rules
npm run prod         # verify, then deploy (only when the user asks)
npm run deploy       # build + firebase deploy: app + rules (only when the user asks)
npm run deploy:app   # build + hosting only
npm run deploy:rules # Firestore rules + indexes only
```

Firebase project id: `pocketclass-bd866`. App: https://pocketclass-bd866.web.app. Operations guide (French):
[docs/operations.md](docs/operations.md).

## Roadmap

Phase 1 (done): skeleton, import, map, sheet. Done after phase 1: child device linking
(one-time code), nickname / avatar, "sheet read" progress + dashboard, notes. Phase 2: practice
engine, `fractions.*` generators, attempts. Phase 3: assessments, scoring, pointsLedger.
Phase 4: summary photo flow. Phase 5: child-side extras (QR code if needed). Phase 6:
spaced repetition, in-app AI prompts, quick lesson entry (`lesson@1`).

## Git

Conventional Commits in English, short one-line messages, no attribution lines.
