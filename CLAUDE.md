# PocketClass — project memory

Family revision PWA for two middle-schoolers (3e / brevet, and 6e). A **binder** of revision
sheets: **subject** (one per grade, e.g. Maths 3e) → **chapter** (independent folders, optionally
shown under a display-only **group** such as "Algèbre") → **sheet** (stored as a `concept`).
Phase 1 brief: [docs/prompt-claude-code-phase1.md](docs/prompt-claude-code-phase1.md) (its
`path@1` part is superseded by the binder, see the 2026-11-24 decision).

A concept has: 3–6 **key points** (the backbone, everything links to them), a **study sheet**
(sections + examples + pitfalls), unlimited **practice** exercises, one **assessment** (the only
thing that earns points, phase 3) and a **summary** written on paper and checked by an external AI
(phase 4).

Content is produced by an **external AI**: the app builds the prompt (subject, grade, chapter,
ids already used), the parent pastes it into any AI, gets JSON back, pastes it into the app.
**The app never calls an AI API.**

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

| Layer                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Where                                                                                                                                                                     | Rules                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Routes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `src/routes/**`                                                                                                                                                           | No `firebase/*` import, no refs or queries. Read data with `live(() => … && watchX(…))`, render states with `<LoadState>`. Parent pages go under `routes/parent/` (admin guard in its `+layout.svelte`).                                                                                                                                                                                                                                                                                                                                                           |
| Components                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `src/lib/components/`                                                                                                                                                     | Reusable UI: `LoadState`, `BackLink`, `Icon`, `SubjectBadge`, `SessionGate` (+ `LinkDeviceForm`), `Avatar`, `ProfileLookForm`, `SubjectCards` (binder + progress, child home and parent view), `TallyLine`, `SheetStateBadge`, `NoteForm` / `NoteList` / `ProfileNotes`, `ConfirmDelete` (type « SUPPRIMER »; `ConfirmDeleteDialog` = same in a modal), `ConfirmDialog` (yes / no modal: never the browser's `confirm()`), `PointsBadge`, `ChildDevices`, `TestModeBanner`, `AcquiredStamp` /                                                                      |
| `AcquiredStamps` (+ `AcquiredToggle`), `MindMap` (sheet mind map, `/concept/[id]/map`), `FailedStamp` (« Raté »), `NoteFab` (root layout), `PlayerHeader` (top of the practice / challenge / assessment pages), `AssessmentSettings` (parent card on a sheet), `ChildStats` (`/parent/stats`: one profile's overview or one binder's detail). Practice: `exercises/ExercisePlayer` (one component per answer style: `ChoiceExercise`, `TextExercise`, `ClozeExercise`, `OrderingExercise`, `MatchExercise`, `CategorizeExercise`, `SelfAssessExercise`; then `AnswerFeedback`), `PracticeScores` (parent view). Parent binder tools: `OrderActions` (↑ ↓ hide), `SubjectForm`, `ChapterForm` / `ChapterSettings`, `ExtraSubjects`, import flow = `PromptCopy` + `JsonPaste` (any Zod schema) + `ImportPreview` + `ImportResult`. Shared components take `familyId` / `profileId` props. |
| App state                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `auth.svelte.ts` (`session`), `online.svelte.ts` (`connectivity`)                                                                                                         | Runes singletons. `session.profile` is live; use `session.profileId` / `session.childId` (primitives) in `live()` sources; `isAdmin` / `isChild`.                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Data                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `src/lib/data/`                                                                                                                                                           | The only code touching Firestore. `refs.ts` builds every path (names in `collections.ts`). `sources.ts`: `Subscribe` sources (`docSource`, `querySource`) and cache-first one-shot reads (`firstSnapshot`, `getDocCacheFirst`). Domain sources are named `watchX` (`catalog.ts`, `family.ts`, `devices.ts`, `progress.ts`, `notes.ts`); `combine()` merges sources for one `<LoadState>` (`watchBinder`, `watchSubjectContent`…). Parent binder edits in `catalogEdit.ts`, deletions in `catalogDelete.ts`. Executors of pure plans live here (`importSheets.ts`). |
| Pure logic                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `schemas/`, `import/`, `account/`, `binder/`, `prompts/`, `math/`, `render/`, `i18n/`, `linking/`, `profile/`, `notes/`, `practice/`, `generators/`, `mindmap/`, `stats/` | No **runtime** Firebase import: unit-tested with Vitest. May import types from `data/types.ts` and names from `data/collections.ts` (both pure). Phase 2 practice engine and exercise generators live here.                                                                                                                                                                                                                                                                                                                                                        |

- **Pattern for Firestore features**: pure planner in a pure module (unit-tested) + thin
  executor in `data/` (e.g. `import/sheetPlan.ts` + `data/importSheets.ts`). Keep it for
  attempts, points, summaries.
- **Reads are cache-first** (work offline), except deliberate online-only parent actions such as
  the import, which reads from the server (`data/importSheets.ts`).
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
- **Colour charter « trousse d'écolier »** (2026-11-25, design in
  `docs/superpowers/specs/2026-11-25-styling-charter-design.md`): the teacher corrects in red
  and green, the pupil writes in blue, yellow highlights what to do, pencil grey is a draft. A
  colour keeps its meaning everywhere; button importance comes from intensity, not hue.
  Buttons: main action (one per moment) `btn-primary`; navigation `btn-soft btn-primary`;
  secondary / cancel / tools `btn-ghost`; the child's own voice (notes) `btn-secondary`;
  self-assessed answers `btn-soft btn-success|btn-error`; delete / unlink `btn-soft btn-error`
  (trash icon), final confirmation `btn-error`. Never a bare `btn` without a role. Sheet
  statuses share one colour on filter chip, badge, path step and stamp (`STATUS_CHIP`,
  `STATUS_BADGE`, `STATUS_STEP` in `binder/colors.ts`): new / updated blue, « En cours » grey,
  read soft green + check, acquired solid green + star (the « Acquise » stamp too), failed
  red + sad face; « Toutes » is plain ink (chip off = outlined, on = filled). Gold
  (`badge-warning`) is for points and rewards. Parent management lists: one card per group,
  rows (square, dividers) with a stretched link (`after:absolute after:inset-0`, actions `relative` above it) and
  a pale highlighter hover (`hover:bg-primary/15`, title underlined).
- **Links and hovers** (2026-11-25, user's rules, apply them everywhere; classes in `app.css`):
  nothing is underlined on hover; only links inside running text (`a:not([class])`, Markdown)
  stay underlined. A whole card that opens a page = `.link-card` (mustard border and a 2px lift with a
  shadow under a mouse or keyboard focus, pressed in on tap); a row of a list inside a card (parent lists, key points,
  a child's name on « Remarques ») = `.link-row` (same mustard border, stretched link
  `after:absolute after:inset-0`, actions `relative` above it); a short link in a card (where a
  note was written) = `.link-text` (highlighter swipe); a subject picture that is a link =
  `.link-icon` (tilts). The picture at the left of a clickable card or row tilts too
  (`.link-lead`: set by `<SubjectBadge>` and `<Avatar>` themselves, add it to any other leading
  icon or number). Several things opening the same page light up together (chapter path:
  the step bubble is a link too, `group-hover` on the card and a ring on the bubble). Tags fill
  in mustard. Hide / show: the eye shows the **current state**, as in
  layer panels (open `UI_ICONS.eye` = visible to children, `eyeOff` = hidden; the click
  toggles), the `title` / text names the action (« Masquer » / « Afficher »); icon-only in list
  rows. The home binders (`.binder-card`) have the strongest motion: they slide
  up 4px and their picture tilts more. They keep their subject-coloured frame, and a card with a subject stripe (`border-l-8`) keeps
  its stripe on hover. Gotcha: daisyUI 5 puts
  `.card-border` in the **utilities** layer, so a border colour set in `@layer components` never
  shows on a card: the `.link-card` hover border lives in `@layer utilities`. No other hover animation.
- **Child writes** (progress, notes, profile look) and **parent binder edits** (subjects,
  chapters, order, hide) go through `inBackground()` (`data/writes.ts`): not awaited, so they
  work offline (local cache first, live sources update at once). Parent actions that need the
  server (import, link code, unlink) are awaited and disabled offline.
- **Rules** change ⇒ add a case in `tests/rules/firestore.rules.test.ts` (`npm run test:rules`).
- **Child test mode**: every child-side feature reads `session.childView` (never the role:
  `session.isChild` is only for what a real child device does, e.g. unlinking it) and writes
  with `childView.ownerId`. It must work when a parent tests as a child: their writes land on
  the parent's own profile and `resetTestData` (`data/family.ts`) must clear them (add new
  per-profile collections there: attempts, points…).

### To plan in later phases (not coded on purpose)

- Phase 3 (rest): more points (revision, activity history) on the same ledger (deterministic ids +
  `increment()`, transactions do not work offline). Notes on exercises: `NoteTarget.exerciseId` already exists.
- Device linking: a QR code was left out on purpose (on iOS a QR opens Safari, whose storage
  is separate from the installed PWA). Expired link codes are never deleted (harmless, could
  be cleaned by the parent later). Converting an anonymous account (`linkWithCredential`)
  would let a child sign in again on a new phone without a code.

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
  `scoring: { pointsPerCorrect: 5, perfectBonus: 15 }` (removed 2026-11-25: pass rate + points, see « Assessment »). (Exercise `content` sub-object: removed
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
  `generateSW` + `autoUpdate` (now `prompt`, see below), registered in the root layout (`virtual:pwa-register`). Manifest
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
- 2026-11-23 — Emulator ports: Firestore **8180** (8080 is often taken, e.g. by Docker) and
  Hosting **5050** (5000 = macOS AirPlay receiver). Set in `firebase.json`, repeated in
  `src/lib/firebase.ts`, `tests/rules/firestore.rules.test.ts` and `scripts/test-rules.ts`.
  `test:rules` reuses a running emulator only if the port answers like one (`Ok` on `/`),
  otherwise it fails with a clear message instead of testing against another server.
- 2026-11-23 — UI: Tailwind 4 + daisyUI 5 replace the hand-written CSS (the "no Tailwind"
  line of the brief is lifted). Visual identity from the logo: slate header strip lettered
  "Pocket" chalk / "Class" mustard in both themes, mustard primary, cobalt secondary, chalk
  grain (`--noise`) in dark mode, faint maths doodles (SVG mask) on home and sign-in, full
  logo on the sign-in screen (`src/lib/assets/logo.webp`, 640 px, from `scripts/make-images.mjs`).
  The page background is base-200 through daisyUI's `--root-bg`.
- 2026-11-24 — Service worker in `registerType: 'prompt'`: `src/lib/update.svelte.ts`
  (`appUpdate`) + `<UpdateToast>` offer "Mettre à jour" when a version is waiting, and check
  for updates every hour. "Mettre à jour" reloads on `controllerchange` itself (+ 3 s
  fallback): the plugin only reloads when this page installed the new version, so a version
  found at launch or by the hourly check was activated without a reload. PWA `base` / `buildBase` / `scope` forced to `/`: with Kit's
  relative base the app registered `./sw.js` from the current page (opened on `/concept/x`
  it had no service worker at all). The Playwright browser used here blocks service workers:
  check SW behaviour on a phone or a normal Chrome.
- 2026-11-24 — Build: Firebase and markdown (KaTeX, marked, DOMPurify) in their own chunks
  (`build.rolldownOptions.output.codeSplitting.groups`): their hashes stay the same when our
  code changes, so a deploy no longer makes phones download ~1 MB again.
- 2026-11-24 — Parent page `/parent/notes`: every child's notes (`ProfileNotes`, resolved
  ones hidden unless toggled). Import: late pre-ticks of assigned children no longer
  overwrite boxes the parent already ticked.
- 2026-11-24 — Real phones (iOS + Android) validated by the user: linking, staying signed in,
  icon, dark theme, offline sheet.
- 2026-11-24 — **Binder replaces paths** (user's choices): 3 levels subject → chapter → sheet,
  plus an optional display-only `group` on chapters. Subjects are **per grade** (auto ids); a
  child sees the active subjects of their grade plus `profile.extraSubjects` (set by the
  parent): no assignments any more. Chapters are independent (no map, no order constraint for
  the child); order is an integer renumbered by `moveItem` (↑ ↓). Subjects, chapters and sheets
  are hidden with `archived` (reversible); deletion was added the same day (entry below).
  - Formats: `pocketclass/sheet@1` (one sheet, added to the chapter it is pasted in; same id =
    update: next `version`, same place, missing exercises / assessment archived) and
    `pocketclass/chapter@1` (title, group, sheets: creates a chapter at the end of a subject).
    `path@1` removed; `lesson@1` (photo of the exercise book, phase 6) unchanged. Sheet ids stay
    family-wide: an id used by an **active** sheet of another chapter blocks the import.
  - Prompts built by the app (`prompts/sheetPrompt.ts`, French instructions, English keys) with
    subject, grade, chapter, group, the sheets already in the chapter and the ids already used.
  - "New" / "updated": `progress/{conceptId}` = `{ subjectId, chapterId, openedAt, readAt? }`.
    Opening a sheet writes `openedAt` (merge, offline); never opened = new; sheet `updatedAt`
    (server time of the last import) newer than `openedAt` = updated. Unread = `readAt` deleted.
  - Subject colours = 8 Tailwind palette names (500 shades, `binder/colors.ts`), not daisyUI
    theme colours (several of ours are identical).
  - No migration: old `paths` / `assignments` data is ignored; content is re-imported (the
    sample is now `static/samples/maths-3e-revisions.json`, a `chapter@1`).
- 2026-11-24 — **The parent can delete the catalogue** (user's request: "je dois pouvoir tout
  supprimer"; supersedes "never delete"). `data/catalogDelete.ts`: `deleteSheet`,
  `deleteChapter`, `deleteSubject` (online, awaited, typed « SUPPRIMER »). A sheet goes with its
  exercises, assessment and every child's progress and notes on it; a subject also leaves the
  children's `extraSubjects`, and takes every sheet with its `subjectId` (also the old path
  import's sheets, which have no chapter). Subject and chapter: `<ConfirmDelete>` at the bottom
  of their page; list rows: `OrderActions` `ondelete` + `<ConfirmDeleteDialog>` (modal).
  Subjects without a known grade (left by the old import) are listed under "Sans niveau" and
  their page has no import (the prompt needs a grade). Re-import still archives (never deletes)
  missing exercises. Old `paths` / `assignments` documents stay (invisible).
- 2026-11-24 — Parent home: « Classeurs », one shelf per grade (`SubjectCards` without a
  profile); "Gérer les classeurs". **Motion**: Svelte transitions in `src/lib/motion.ts` (`row`
  in/out on parent list rows, `reorder` = flip on ↑ ↓, `toast`), CSS tokens `--ease-out` /
  `--ease-in-out` in `app.css` `@theme`, page changes with the View Transitions API
  (`onNavigate` in the root layout, CSS `::view-transition-*`, header pinned with
  `view-transition-name`), `.subject-card` press feedback. Strong ease-out curves, exits faster
  than entrances, ≤ 280 ms; `prefers-reduced-motion`: short fades only. No motion library.
- 2026-11-24 — Every page but home starts with `<BackLink href label>`: a 44 px pill with an
  SVG chevron and the parent page's name (a link to the parent page, not `history.back()`:
  deep links and PWA launches have no history). No arrows in the French labels any more.
- 2026-11-24 — **Subject picture** (`<SubjectBadge>`): `subject.image` (data URL from
  `imageFileToAvatar`, like a profile avatar) wins over `subject.icon`; without an icon, one is
  suggested from the name (`binder/icons.ts`: `suggestIcon`, unit-tested). Icons are our own
  24 × 24 line drawings (no icon package: adding a dependency was refused by the permission
  system; ask the user before adding one). Parent list rows wrap their actions under the
  title on narrow screens (title `basis-*` + `flex-wrap`, actions `ms-auto`).
- 2026-11-24 — Child pages take the subject's identity: subject banner (`SUBJECT_TINT`) with
  overall progress, "Continuer" card, numbered chapters; chapter = a path of numbered steps
  (checked once read); sheet = subject · chapter kicker, numbered sections ("Partie n / N"),
  example cards, drawn alert icon (no emoji in UI text). `<Icon>` renders every line icon
  (`ICON_PATHS` for subjects, `UI_ICONS` for the interface); progress bars take the subject
  colour through `currentColor` (`TallyLine barClass`, `SUBJECT_TEXT`).

- 2026-11-24 — **Child test mode** (user's choice: option A, the parent's own data). A parent
  taps « Tester comme {prénom} » on a child's page: the child pages show that child's binder
  (grade + `extraSubjects`) but read and write progress and notes on the **parent's** profile,
  so a test never touches a child's data. `profile/childView.ts` (`childViewOf`, pure) gives
  `session.childView` (`ownerId`, grade, extras, name, `testing`); it replaces `session.childId`
  and the UI uses of `isChild`. The imitated child is remembered per device
  (`localStorage` `pocketclass.testChild.{familyId}`, in `try/catch`) and watched live: if it
  is deleted or not found, the test stops. `TestModeBanner` (root layout): « Remettre à zéro »
  (`resetTestData`, online, simple confirm) and « Quitter ». In test, the home hides « Espace
  parent ». The parent's test notes never show in « Remarques des enfants » (children only).
  No rules change (admins already write everything in their family; a rules case pins it).

- 2026-11-24 — **Parent password** (user's request: Google sign-in asked too often on an
  iPhone PWA). On `/me`, a parent sets a password **linked to their Google account**
  (`linkWithCredential` + `EmailAuthProvider`, same uid → same family, still admin) or changes
  it (`updatePassword`); on `auth/requires-recent-login` the session re-authenticates with the
  Google popup and retries once. The sign-in card adds e-mail + password
  (`signInWithEmailAndPassword`) and « Mot de passe oublié ? » (`sendPasswordResetEmail`,
  neutral message). **No sign-up in the UI** (a separate e-mail account would get an empty
  family). Rules and messages in `account/password.ts` (pure: 8 characters min, Firebase codes
  → French). After a parent's session loads, `navigator.storage.persist()` is requested (as for
  children at link time). The Auth emulator rejects linking a password whose e-mail is the
  account's own (`EMAIL_EXISTS` on any existing e-mail): test that step on the real project;
  sign-in, change and reset were checked on the emulators.

- 2026-11-24 — **Sheet tags**: optional `tags` in `sheet@1` (and the sheets of `chapter@1`),
  no format version change (an optional field breaks no old file): max 10, 1–30 characters,
  duplicates ignoring case and accents dropped silently (Zod transform). The prompt asks for
  3–8 lower-case French keywords a pupil would type. Stored on `concepts/{id}.tags` (replaced on
  re-import; absent on older sheets = none). Searched by « Mes fiches vues » (`searchText`). The
  sheet page shows them as badges; in child view each links to `/me/sheets?q=<tag>`, which
  prefills the search.

- 2026-11-24 — **« Acquise » stamp** (user's choice: set by the parent). `acquiredAt` on
  `progress/{conceptId}` (server time; removed with `deleteField()`), written with
  `setAcquired` through `inBackground()` (offline). The parent stamps from the sheet page (card
  at the bottom, one toggle per child); a stamp on a sheet never opened creates the document
  without `openedAt`, which `sheetState` treats as `new` and `seenSheets` leaves out. Rules: a
  child device never creates, sets, changes or removes `acquiredAt` (nor deletes a stamped
  document) but keeps writing `openedAt` / `readAt` on it. Independent of « read »;
  `nextUnread` skips acquired sheets; `Tally.acquired` shows « n acquises » in `TallyLine`.
  Child view: tilted stamp under the sheet title (subject ink), star step in the chapter. In
  test mode a « Tamponner (test) » button stamps the parent's own profile (cleared by
  `resetTestData`). Phase 3 may set it automatically after a passed assessment.

- 2026-11-25 — **Notes anywhere** (user's choice: a floating button). `NoteFab` (root
  layout) shows « Une difficulté ? » on every child page (`session.childView`); its target
  comes from the route (`noteContext`, pure): chapter page → `chapterId`, subject page →
  `subjectId`, home / `/me*` → free note (every id null), hidden on a sheet (its own form) and
  elsewhere. Notes gain `subjectId` (sheet notes now carry it too); `conceptId` / `chapterId`
  may be null; older notes are unchanged. Rules: `nullableId` (string, null or absent).
  `notePlace` (pure) shows where a note was written (sheet, chapter, subject, free, or gone if
  deleted / hidden). Deleting a chapter or a subject also deletes the notes written on it.

- 2026-11-25 — **Practice, formula A** (user's choices; design in
  `docs/superpowers/specs/2026-11-25-practice-design.md`). New exercise types `match` (2–6
  pairs, sides unique), `true_false`, `categorize` (2–4 categories, items must use them) and an
  optional `explanation` on every exercise (no format version change). The prompt asks ~4
  practice exercises per key point, 8–10 `true_false`, an explanation each. Pure engine in
  `src/lib/practice/`: `answers.ts` (`checkAnswer`: typed answers compared leniently — case,
  accents, spaces, final punctuation — numbers by value, `requireIrreducible` only checked on a
  written « a/b »; `solutionOf`), `series.ts` (`playable` = practice, not generator, not archived;
  `buildSeries` = 10 exercises, key points in turn; `betterScore`), `scores.ts` (parent list).
  Page `/concept/[id]/practice`: one try per question, then right/wrong + right answer +
  explanation; pair / paper are self-assessed (« Je savais ») and count; ordering with ↑ ↓ (no
  drag); match = tap a left then a right. End: score, « Refaire mes erreurs » (replay, not
  recorded), « Nouvelle série ». A finished series = one batch through `inBackground()`
  (`data/practice.ts` `saveSeries`): an `attempts` document (history) + `practiceLast` /
  `practiceBest` / `practicedAt` merged on the progress document. Rules: attempts create-only
  by the own device (keys, mode, `0 ≤ correct ≤ total ≤ 100`, `answers.size() == total`,
  `createdAt == request.time`); progress accepts the 3 practice keys (scores checked). Attempts
  are cleared by `resetTestData`, profile deletion and catalogue deletion. The sheet button
  shows last and best; the parent's child page has an « Entraînement » card (best % per sheet,
  most recent first).
- 2026-11-25 — **Timed challenge, formula C**: `/concept/[id]/challenge`, 60 s of quick
  questions (`mcq`, `true_false`, `calculation`: `practice/challenge.ts` `challengePool`), drawn
  from an endless queue (whole pool before repeating, never twice in a row), needs at least 4.
  No explanation; next question after 0.45 s (right) or 1.5 s (wrong, to read the right answer);
  no penalty. Timer from a deadline (`Date.now()`), not a tick count. Record = most right answers:
  `challengeBest` (int ≤ 100) + `challengedAt` on progress, and an `attempts` doc with
  `mode: 'timed'` (`saveChallenge`, same batch helper as `saveSeries`). Shown on the sheet
  (« Défi : n ») and in the parent's « Entraînement » card. Choice buttons (mcq, true / false)
  no longer repeat « La bonne réponse » (the green button shows it).
- 2026-11-25 — **Exercise generators** (user's choices; design in
  `docs/superpowers/specs/2026-11-25-generators-design.md`). A `generator` exercise of the
  JSON (`generator`, `difficulty` 1–3, optional `params`) makes at each draw an ordinary
  `calculation` / `mcq` / `true_false` with its answer and explanation. Pure module
  `src/lib/generators/` (`catalog.ts` registry, one file per family: `calculation.ts`,
  `algebra.ts`, `geometry.ts`, `units.ts`; `random.ts` with `seeded()` for tests, `format.ts`).
  25 generators; each is tested over 300 draws × 3 difficulties (schema-valid, answer accepted
  by `checkAnswer`, 4 distinct MCQ options, no exponent notation) plus recomputation tests.
  Numbers: French decimals, exact comma shifts with `scaled(digits, exp)`; KaTeX `3{,}5`;
  with π or a root the statement asks for a value rounded to the tenth. Expanding /
  factorising are MCQs of typical mistakes; a distractor equal in value to the answer is dropped
  (evaluated at a few points). Unknown params are ignored (`allowed()`); unknown generator
  names are rejected at import (`fr.validation.unknownGenerator`). The prompt lists the
  generators of the sheet's grade with their params (`generatorsForGrade`) and asks 1–2 per
  suitable key point. Player (`practice/generated.ts`): `watchPracticeSet` gives
  `{ written, generators }`; a series = written exercises first, then generated questions up
  to 10 (generators in turn); the challenge queue mixes quick written exercises and generators,
  is possible with one generator (`canChallenge`), and never asks the same generated text twice
  when it can avoid it. Generated id `<generator exercise id>~<n>` (stored in `attempts`).
  The calculation checker also accepts spaced thousands (« 3 500 ») and « x = 2 ».
- 2026-11-25 — **Assessment « Contrôle »** (phase 3, user's choices; design in
  `docs/superpowers/specs/2026-11-25-assessment-design.md`). Page `/concept/[id]/assessment`.
  Draw (`practice/assessment.ts`): per key point `draw.perKeyPoint` (2) questions, generated
  when the key point has a generator (any usage; new questions at each try, so a retake cannot
  be memorised), else written `assessment` exercises (`exerciseIds` if given); `pair` /
  `paper` excluded (self-assessed). No feedback while playing (`ExercisePlayer feedback={false}`),
  correction at the end (`correctionOf`). Pass at `passRate` (70 %); points
  `points` (10 per key point); both set by the parent per sheet (`AssessmentSettings` card,
  stored only when changed, kept by a new import, `settingsOf` gives the defaults). Every sheet
  now gets an assessment document at import (default `{ type: 'test', draw: { perKeyPoint: 2 } }`);
  the unused `scoring` field is gone. Outcome (`assessmentOutcome`, pure): first pass stamps
  `acquiredAt` (kept for good, the parent can still remove it) and earns the points **once**
  (`assessmentPoints` on progress + `pointsLedger/assessment-<sheet>` + `profile.points`
  `increment()` + `lastEarningId`, one offline batch `saveAssessment`); later tries only update
  `assessmentBest`. A fail while not acquired stamps `failedAt` (« Raté », sad face drawn,
  `FailedStamp`) and sets `retakeLocked`, cleared by the next finished practice series
  (`saveSeries`). Rules: the child may set `acquiredAt` only with a passing `assessmentLast`
  (pass rate read from the assessment, 70 by default); the points line is created once, by the
  sheet's amount, after a pass; the profile counter only grows by the line named in
  `lastEarningId`, created in the same batch. Points shown on the child home and the parent's
  child page. `resetTestData` clears the points lines and sets the parent's points to 0.
- 2026-11-25 — **Review of generators + assessment** (3 reviewer agents). Fixed: a `units`
  param listing only same-size units (`["dm³", "L"]`) is ignored instead of crashing the page;
  deleting a sheet also deletes its points lines (points already counted stay on the profile;
  a sheet re-imported with the same id can be earned again, else its pass batch was refused);
  `draw.perKeyPoint` ≤ 15 and at most 100 questions (the rules cap an attempt at 100 answers);
  a fail never locks a sheet without practice content (`assessmentStatus(progress,
canPractise)`). Rules tests added (default 70 % without an assessment document, parent's
  amount, first pass creating the progress, parent test-mode points). Refactor:
  `session.ownerId` (whose data child pages use), `<PlayerHeader>`, `knownGenerators` /
  `StoredExercise` shared by practice and assessment, one per-key-point rule for
  `buildAssessment` and `assessmentSize`, `commonDenominator`, test fixtures in
  `practice/testing.ts`. Not done on purpose: one engine for the three player pages (their flows
  differ: timer, feedback per question or at the end, replay), a generic stamp component.
  Known limit: passing on two devices with a stale cache makes the second batch fail on the
  create-only points line (no double points, that attempt is lost).
- 2026-11-25 — **First real-content fixes** (user's French 6e chapter from Gemini). An ordering
  exercise with a repeated item (« -e » twice) crashed the page: Svelte keyed `{#each}` blocks
  must never key on content text (ordering items are keyed by position; MCQ choices are
  de-duplicated). Import now rejects an MCQ whose options repeat (or a distractor equal to the
  answer) and twin categories. UI: every yes / no question uses `<ConfirmDialog>` (modal, red
  confirm when destructive) instead of `confirm()`; delete buttons are red (`btn-soft
btn-error`) with a trash icon; the child home links are big rows (icon, title, hint, count);
  points per subject (`pointsBySubject`, summed from `progress.assessmentPoints`) on the subject
  cards and banner, total on the home (`<PointsBadge>`).
- 2026-11-25 — **Navigation style and export / restore** (user's choices). Navigation buttons
  (`<BackLink>`, « Retour à la fiche ») are `btn-soft btn-primary`: pale mustard, dark text,
  hover deepens the tint (rules outside the CSS layers in `app.css`, since daisyUI's soft style
  writes mustard on mustard and turns solid on hover); ghost buttons hover in light mustard.
  Child chapter / sheet cards: mustard border and underlined title on hover. « Notion acquise »
  lists only the children who see the sheet (`seesSubject`, also used by `visibleSubjects`).
  Export (`<ExportButton>`, JSON download) of a sheet (`sheet@1`, on the sheet page), a chapter
  (`chapter@1`), a subject (`subject@1`) and every binder (`binder@1`, on « Gérer les
  classeurs »): pure builders in `import/catalogExport.ts` (import → export round trip tested),
  reads in `data/catalogExport.ts`; hidden items left out; the assessment keeps the parent's
  `passRate` / `points` (now optional in the sheet format). Restore (`<BackupRestore>`, file or
  paste) adds the subjects as new ones at the end of their grade (`planSubject`,
  `importBackup`); a sheet id already used by an active sheet blocks it, as for any import.
- 2026-11-25 — **Acquired = read, « Raté » and filters on the chapter page** (user's requests). An
  acquired sheet counts as read everywhere (`isRead`, `sheetState`; even never opened), derived
  at display time: no extra write, old stamps included; the sheet page hides « non lue » once
  acquired. The chapter path shows a failed assessment (dashed red step with the sad face,
  « Raté » badge; `isFailed`). Toggle chips filter the sheets by one status each
  (`sheetStatus`, priority acquired > failed > new / updated > read > opened; several chips may
  be on, none = all; counts shown, empty statuses hidden; reset when the chapter changes).
  Import rejects an answer (MCQ answer / distractors, open answers, cloze blanks) holding
  « -> »: an AI's self-correction left in the JSON (« suis -> non, j'oublie »); the prompt asks
  for final answers only.

- 2026-11-25 — **Mind maps** (user's choices; design in
  `docs/superpowers/specs/2026-11-25-mind-maps-design.md`). One map per sheet: centre = sheet
  title, one branch per key point (numbered as « L'essentiel »), 1–4 short leaves. Optional
  `mindMap: [{ keyPoint, leaves }]` in `sheet@1` (and chapter sheets; key point must exist, once
  each, leaf ≤ 60 chars), asked by the prompt, stored on the concept, exported; without it the
  leaves are the titles of the sections about the key point (`mapBranches`, pure in
  `src/lib/mindmap/`). « Me tester »: 3 questions on a branch, 5 on the whole map (key points in
  turn), the sheet's written practice exercises drawn **without replacement per child**
  (`drawMapTest`; `progress.mapDrawn` = ids drawn, saved when a test starts, a new round when
  all came out, unknown ids dropped), completed by the branch's generators. No points, no
  `attempts`. Rules: `mapDrawn` list ≤ 200. Page `/concept/[id]/map` (`<MindMap>`): squared
  exercise-book paper (`.squared-paper`, this page only), centre highlighted (`.highlighter`,
  the page `h1`), branches in the subject's ink; from `lg` a radial layout wider than the text
  column (64rem) with SVG curves measured on the DOM (`ResizeObserver`) and drawn once
  (`drawLine` in `motion.ts`), below `lg` a tree going down. « Carte mentale » button on the
  sheet (navigation style). The sample chapter's first sheet has a mind map.

- 2026-11-25 — **Child statistics** (user's choices; design in
  `docs/superpowers/specs/2026-11-25-child-stats-design.md`). Page `/parent/stats`
  (`?child=`, `?subject=`; « Statistiques » on the parent home and a child's page): child chips
  plus « Mes tests » (the parent's own test data), an overview (points, sheets read /
  acquired, finished runs, last activity, one card per visible subject) and a binder's detail
  (one row per sheet, the 20 latest runs with date and time). Pure `stats/stats.ts`
  (`groupStats`, `runs`, `recentAttempts`). Finished runs come from `attempts`; two new kinds
  of counters on progress, `increment(1)` through `inBackground()` (offline): `openCount`
  (once per sheet shown, not on each catalogue update) and `seriesStarted` /
  `challengeStarted` / `assessmentStarted` (a new series, not the mistakes replay). Rules:
  `validCounter` = absent, unchanged or previous + 1. Counters only count since their release:
  « started » is hidden when it is below the finished runs. Mind map tests are not counted.
- 2026-11-26 — **Re-import of a chapter** (user's report: a re-imported export was refused,
  « déjà dans un autre chapitre »). The parent's chapter page also accepts a `chapter@1` file
  (`sheetOrChapterSchema`, `sheetsOf`): its sheets are updated or added in **this** chapter (its
  title / group in the file are ignored); the subject page still creates a new chapter. A
  conflict now names the chapter that owns the sheet (`chapterTitle`, read by
  `readExistingSheets`) with a link to it. Parent space buttons on the home: icon + one word
  (Classeurs, Profils, Remarques, Statistiques).
- 2026-11-26 — **Revision points and hourglass** (user's choices). On an **acquired** sheet, a
  finished practice series at **70 %** or more earns **2 points per key point**, then nothing
  on that sheet for **7 days** (`practice/revision.ts`: `revisionStatus`, `revisionOutcome`,
  `binderRevisions`; client check with a 5-minute margin on the device clock, since a refused
  revision would lose the whole series batch). Same batch as the series (`saveSeries`, shared
  `earnPoints` with the assessment): `revisedAt`, `revisionCount`, `revisionPoints` on progress
  - `pointsLedger/revision-<sheet>-<n>` + profile `increment()`. Rules (`revisionRecorded`,
    `revisionLine`): acquired before, count + 1, `request.time` ≥ last + 7 d, `practiceLast` ≥ 70 %
    written now, line of 2 × key points, `revisionPoints` grows by the line; never on a new
    progress document. Points per subject add `revisionPoints`. UI: `<RevisionHourglass>` (sheet
    page and end of a series; `ticking()` in `clock.svelte.ts` refreshes every 30 s), page
    `/me/revisions` (ready first, then hourglasses, soonest first) linked from the child home with
    the count ready.
- 2026-11-26 — **Activity history** (user's choices: child and parent, runs + points, 30 days
  then « Voir plus »). Nothing new is stored: `stats/activity.ts` merges the `attempts` with the
  `pointsLedger` lines (a line is written in the same batch as its run, so both carry the same
  server time: matched on sheet · run kind · time; an orphan line is shown alone), judges
  assessments at the sheet's pass rate (assessments collection, 70 % by default) and groups by
  local day (« Aujourd'hui », « Hier », weekday). `<ActivityFeed>` (source `watchActivity` in
  `data/activity.ts`) on the child's `/me/activity` (home link) and under the overview of
  `/parent/stats`. The window grows client-side (every run is read, as the statistics already
  do); a `limit` query can come later if a profile ever has thousands of runs.

## Firestore model

```
users/{uid}                                    { familyId, profileId }   (both = uid for new parents)
linkCodes/{code}                               { familyId, profileId, expiresAt }   (one-time device link code)
families/{familyId}                            { name, admins: [uid], createdAt }   (familyId = parent uid)
  devices/{uid}                                { profileId, code, linkedAt }      (child phone, anonymous uid)
  profiles/{profileId}                         { firstName, role: admin|child, grade, points, nickname?, avatar?,
                                                 extraSubjects?, lastEarningId? }
  subjects/{subjectId}                         { name, grade, color, order, archived, icon?, image? }   (auto id)
  chapters/{chapterId}                         { subjectId, title, group|null, order, archived }   (auto id)
  concepts/{conceptId}                         { subjectId, chapterId, title, order, tags?, prerequisites, keyPoints,
                                                 mindMap?, sheet, summaryInstruction, version, updatedAt, archived }   (a sheet)
  concepts/{conceptId}/exercises/{exerciseId}  { usage, type, keyPoint, difficulty, ...type fields, archived }
  assessments/{assessmentId}                   { chapterId, conceptIds, type, draw?, exerciseIds?, paper?, passRate?, points?,
                                                 archived }   (id = sheet id; passRate / points set by the parent)
  profiles/{profileId}/progress/{conceptId}    { subjectId, chapterId, openedAt?, readAt?, acquiredAt?, practiceLast?,
                                                 practiceBest?, practicedAt?, challengeBest?, challengedAt?,
                                                 assessmentLast?, assessmentBest?, assessedAt?, failedAt?, retakeLocked?,
                                                 assessmentPoints?, mapDrawn?, openCount?, seriesStarted?,
                                                 challengeStarted?, assessmentStarted? }
                                                 (sheet opened / read; acquiredAt = « Acquise » stamp, by the parent or
                                                 a passed assessment; practice* / assessment* = { correct, total };
                                                 challengeBest = right answers in 60 s; failedAt = « Raté » stamp)
  profiles/{profileId}/attempts/{attemptId}    { conceptId, subjectId, chapterId, mode: series|timed|assessment, correct,
                                                 total, answers: [{ exerciseId, correct }], createdAt }   (create only)
  profiles/{profileId}/pointsLedger/{entryId}  { kind: assessment|revision, conceptId, subjectId, chapterId, amount, createdAt }
                                                 (id assessment-<sheet>: once per sheet; revision-<sheet>-<n>: a
                                                 series ≥ 70 % on an acquired sheet, once a week; create only)
  profiles/{profileId}/notes/{noteId}          { conceptId|null, chapterId|null, subjectId?|null, exerciseId, text,
                                                 status: open|seen|resolved,
                                                 createdAt, updatedAt }
  profiles/{profileId}/summaries               (phase 4)
```

- Catalogue (subjects, chapters, concepts, exercises, assessments) belongs to the family;
  progress belongs to the profile.
- Stable ids from the import: concept (sheet) id = JSON id; exercise id = JSON id (unique per
  sheet). Subject and chapter ids are generated.
- Re-import of a sheet = upsert, `version` increments, missing exercises get `archived: true`.
  Only an explicit parent deletion removes catalogue documents (`data/catalogDelete.ts`).
- Writes go through `writeBatch`, max 450 operations per batch.

## JSON formats (`src/lib/schemas/`)

`pocketclass/sheet@1`, `pocketclass/chapter@1`, `pocketclass/subject@1` and `pocketclass/binder@1` (backups, exported by the app), `pocketclass/lesson@1`, `pocketclass/summary@1`. JSON Schemas are exported
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
(one-time code), nickname / avatar, "sheet read" progress + dashboard, notes, binder
(subjects / chapters / sheets, replaces paths; a curated "path" may come back later as a
selection of sheets). Phase 2 (in progress): practice series and 60 s timed challenge
done (player, 10 playable types, attempts, scores), exercise generators done (25, four families). Phase 3 (in progress): sheet assessment with pass rate, stamps and points done; next: other ways to earn points (revision, activity history).
Phase 4: summary photo flow. Phase 5: child-side extras (QR code if needed). Phase 6:
spaced repetition, in-app AI prompts, quick lesson entry (`lesson@1`).

What is done, what to check at the next deploy, the next steps (styling charter, mind maps,
revision points + activity history, practice follow-ups) and the ideas set aside (photo
upload…) are in [docs/backlog.md](docs/backlog.md) (French). Keep it in sync when one is done
or decided.

## Git

Conventional Commits in English, short one-line messages, no attribution lines.
