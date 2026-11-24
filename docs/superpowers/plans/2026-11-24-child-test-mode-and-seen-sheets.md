# Child Test Mode and Seen Sheets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the parent use the app as a chosen child (writing only to their own profile, with a reset), then add the child's « Mes fiches vues » page (search, subject chips, random pick).

**Architecture:** A pure `childViewOf()` replaces the role checks (`session.isChild` / `session.childId`) in every child page: it says which subjects to show (the child's grade and extras) and whose progress and notes to read and write (`ownerId`). The session keeps the imitated child id in `localStorage` and watches that profile live. The seen-sheets page is a thin route over a pure, unit-tested `binder/seen.ts`.

**Tech Stack:** SvelteKit 3 + Svelte 5 runes, TypeScript strict, Firebase JS SDK 13 (Firestore), Vitest, Tailwind 4 + daisyUI 5.

**Spec:** [docs/superpowers/specs/2026-11-24-child-test-mode-and-seen-sheets-design.md](../specs/2026-11-24-child-test-mode-and-seen-sheets-design.md)

## Global Constraints

- All code, identifiers and comments in English; every user-facing string in `src/lib/i18n/fr.ts` (French).
- Imports use `#lib/<path>.ts` with the extension (no `$lib`).
- Routes never import `firebase/*`; Firestore code only in `src/lib/data/`.
- Pure modules (`profile/`, `binder/`) have no runtime Firebase import and are unit-tested.
- Child-side writes stay `inBackground()` (offline). The test-data reset is online, awaited, disabled offline (`connectivity.online`).
- Styling: daisyUI components + Tailwind utilities, theme colours only (subject colours through the existing `binder/colors.ts` maps); no new dependency.
- No Firestore rules change (the admin already reads and writes everything in the family).
- Run commands after `nvm use 24`. Commits: Conventional Commits, one line, English, no attribution lines.
- A real child must see exactly what they see today; the parent's test actions must never write under a child profile.

## Review Focus

1. **Imitated child deleted or unknown** (stored id points to a deleted profile, or to another family after an account switch): test mode stops by itself, no error screen. Key namespaced by family; session stops the test when the watched profile is `null` (Task 2, manual check in Task 6).
2. **`localStorage` unavailable** (private browsing, blocked storage): reads/writes in `try/catch`; test mode still works for the session, just not remembered (Task 2).
3. **A real child device with a leftover key**: `childViewOf(child, anything)` ignores the test child (Task 1 test `a child always gets their own view`).
4. **Search input**: accents, case, extra spaces, empty query, LaTeX in titles (`$\frac{1}{2}$`) (Task 4 tests in `filterSeen`).
5. **Seen list edges**: pending `openedAt` (`null`) sorts first; sheets in archived chapters or in subjects no longer visible are excluded (Task 4 tests in `seenSheets`).

---

### Task 1: `childViewOf` (pure)

**Files:**
- Create: `src/lib/profile/childView.ts`
- Test: `src/lib/profile/childView.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface ChildView {
  	ownerId: string;          // profile whose progress / notes are read and written
  	grade: Grade | null;      // decides the visible subjects
  	extraSubjects: string[];
  	name: string;             // displayName() of the child shown
  	testing: boolean;         // true when the parent is testing
  }
  export function childViewOf(
  	profile: WithId<Profile> | null,
  	testChild: WithId<Profile> | null
  ): ChildView | null;
  ```

- [ ] **Step 1: Write the failing tests** (`describe('childViewOf')`):
  - `a child always gets their own view` — child `lea` (grade `'6e'`, extras `['maths-3e']`, nickname `'Lélé'`) with testChild `tom` → `{ ownerId: 'lea', grade: '6e', extraSubjects: ['maths-3e'], name: 'Lélé', testing: false }`.
  - `a parent without a test child has no child view` — admin `alice`, testChild `null` → `null`.
  - `a parent testing sees the child's binder but owns the data` — admin `alice` + testChild `tom` (grade `'3e'`, no extras, firstName `'Tom'`) → `{ ownerId: 'alice', grade: '3e', extraSubjects: [], name: 'Tom', testing: true }`.
  - `only a child profile can be imitated` — admin `alice` + testChild with `role: 'admin'` → `null`.
  - `no profile, no view` — `childViewOf(null, tom)` → `null`.
- [ ] **Step 2: Run** `npx vitest run --project server src/lib/profile/childView.test.ts` — Expected: FAIL (module not found).
- [ ] **Step 3: Implement** `childViewOf` in `src/lib/profile/childView.ts` (uses `displayName` from `profile/display.ts`; `extraSubjects ?? []`).
- [ ] **Step 4: Run** the same command — Expected: 5 passed.
- [ ] **Step 5: Commit** `git commit -m "feat(profile): child view of a profile (own or imitated child)"`

---

### Task 2: Session `childView` and child pages migrated

**Files:**
- Modify: `src/lib/auth.svelte.ts` (session class)
- Modify: `src/lib/components/SubjectCards.svelte`
- Modify: `src/routes/+page.svelte`, `src/routes/subject/[id]/+page.svelte`, `src/routes/chapter/[id]/+page.svelte`, `src/routes/concept/[id]/+page.svelte`, `src/routes/me/notes/+page.svelte`, `src/routes/parent/profiles/[id]/+page.svelte`

**Interfaces:**
- Consumes: `childViewOf`, `ChildView` (Task 1); `watchProfile(familyId, profileId)` (`data/family.ts`).
- Produces (on `session`):
  - `testChildId: string | null` (`$state`), `childView: ChildView | null` (`$derived`);
  - `startTest(childId: string): void`, `stopTest(): void`;
  - `childId` is **removed**; `isChild` stays (real role, used only by `/me` unlink).
  - `SubjectCards` props become `{ familyId: string; view: Pick<Profile, 'grade' | 'extraSubjects'> | null; ownerId: string | null }` (a `ChildView` and a child `Profile` both fit).

- [ ] **Step 1: Session state.** In `Session`:
  - `testChildId` loaded in `#load` (after the profile, admins only) from `localStorage` key `` `pocketclass.testChild.${familyId}` ``; read/write/remove wrapped in `try/catch` (storage may be unavailable).
  - `#testChild = $state<WithId<Profile> | null>(null)`, fed by a `watchProfile(familyId, testChildId)` listener started/stopped by `startTest` / `stopTest` / `#reset` (keep its stop function apart from `#stops` so `stopTest` can end it alone). When the listener gives `null` (profile deleted), call `stopTest()`.
  - `childView = $derived(childViewOf(this.profile, this.#testChild))`.
  - `startTest(childId)`: admins only; stores the key, sets `testChildId`, starts the listener. `stopTest()`: removes the key, clears both, stops the listener. `#reset` clears both without touching storage.
- [ ] **Step 2: `SubjectCards`.** Replace the `profile` prop by `view` + `ownerId`: `watchBinder(familyId, ownerId)`; `shelves()` uses `view` where it used `profile` (`visibleSubjects(subjects, view)`); the other-grade badge compares with `view.grade`.
- [ ] **Step 3: Pages.** Replace, keeping behaviour identical for a real child:
  - `session.isChild` (UI) → `session.childView` truthy; `session.childId` → `session.childView?.ownerId ?? null` (read it into a `$derived` primitive before `live()`).
  - Home: `SubjectCards view={session.childView} ownerId={session.childView?.ownerId ?? null}`; greeting uses `session.childView?.name` when set, else `displayName(session.profile)`; the « Espace parent » section only when `session.isAdmin && !session.childView`; heading `myBinder` when `childView`, else `familyBinder`.
  - Subject page grade badge: shown when `!session.childView || subject.grade !== session.childView.grade`.
  - `/me/notes`: `profileId={session.childView.ownerId}` (render only when `childView`).
  - Parent child page: `<SubjectCards {familyId} view={child} ownerId={child.id} />`.
- [ ] **Step 4: Verify** `npm run check` — Expected: `0 ERRORS 0 WARNINGS`; `grep -rn "childId" src` lists nothing from `session`.
- [ ] **Step 5: Verify** `npm run test` — Expected: all tests pass (no behaviour change for children).
- [ ] **Step 6: Commit** `git commit -m "refactor(session): child view replaces child checks in child pages"`

---

### Task 3: Enter, leave and reset test mode

**Files:**
- Create: `src/lib/components/TestModeBanner.svelte`
- Modify: `src/lib/data/family.ts` (add `resetTestData`)
- Modify: `src/routes/+layout.svelte` (banner under the header), `src/routes/parent/profiles/[id]/+page.svelte` (button), `src/lib/i18n/fr.ts`
- Modify: `tests/rules/firestore.rules.test.ts`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: `session.startTest / stopTest / childView` (Task 2); `deleteInBatches` (`data/batches.ts`); `progressCol`, `notesCol` (`data/refs.ts`).
- Produces: `resetTestData(familyId: string, profileId: string): Promise<void>` — reads `progressCol` and `notesCol` of that profile with `getDocs` (server) and deletes them with `deleteInBatches`.

- [ ] **Step 1: Rules test** in `describe('child writes')` (or a new `describe('parent test mode')`): `it('the parent records and clears test progress and notes on their own profile')` — `as('alice')` `setDoc` on `families/${FAMILY}/profiles/alice/progress/c1` (`{ subjectId: 'maths', chapterId: 'ch1', openedAt: serverTimestamp() }`) and on `.../profiles/alice/notes/t1` (note shape of the seed) → `assertSucceeds`; `deleteDoc` both → `assertSucceeds`; `as('kid-phone')` `getDoc` of `.../profiles/alice/progress/c1` → `assertFails`.
- [ ] **Step 2: Run** `npm run test:rules` — Expected: PASS (documents the existing permission; no rules change).
- [ ] **Step 3: `resetTestData`** in `data/family.ts` (signature above). Its doc comment says that the parent's attempts and points must be added to it when phases 2–3 create them.
- [ ] **Step 4: French strings** in `fr.ts`, section `testMode`, exact copy:
  - `start: (name: string) => \`Tester comme ${name}\``
  - `startHelp: 'Tu vois son classeur, mais ta progression et tes remarques restent à toi.'`
  - `banner: (name: string) => \`Mode test : classeur de ${name}\``
  - `reset: 'Remettre à zéro'`, `resetConfirm: 'Effacer ta progression et tes remarques de test ?'`, `resetFailed: "La remise à zéro n'a pas fonctionné."`, `stop: 'Quitter'`
- [ ] **Step 5: `TestModeBanner`** (rendered in the root layout right after `</header>`, only when `session.childView?.testing`): `alert alert-info alert-soft` strip with `fr.testMode.banner(name)`, a `btn btn-ghost btn-sm` « Remettre à zéro » (`confirm(resetConfirm)`, awaits `resetTestData(familyId, session.profileId)`, disabled while running or offline, shows `resetFailed` in `role="alert"` on error) and a `btn btn-sm` « Quitter » (`session.stopTest()` then `goto(resolve('/'))`).
- [ ] **Step 6: Button** on `/parent/profiles/[id]`, under the header: a `card card-border` with `startHelp` and `btn btn-primary` « Tester comme {displayName(child)} » → `session.startTest(child.id)` then `goto(resolve('/'))`.
- [ ] **Step 7: `CLAUDE.md`**: under « Architecture & conventions » add the rule « **Child test mode**: every child-side feature reads `session.childView` (never the role) and writes with `childView.ownerId`; it must work when a parent tests (writes land on the parent's profile, cleared by `resetTestData`) » ; add `TestModeBanner` to the Components list; replace the « Phase 3: an "active profile"… » line of « To plan » by a decisions-log entry dated 2026-11-24 summarising the spec (option A, `localStorage` key per family, reset online, notes of the parent never listed in « Remarques des enfants »).
- [ ] **Step 8: Verify** `npm run check && npm run lint && npm run test` — Expected: all green.
- [ ] **Step 9: Commit** `git commit -m "feat(profiles): parent tests the app as a child (own data, reset, banner)"`

---

### Task 4: `binder/seen.ts` (pure)

**Files:**
- Create: `src/lib/binder/seen.ts`
- Test: `src/lib/binder/seen.test.ts`

**Interfaces:**
- Consumes: `visibleSubjects`, `reachableSheets`, `sheetState`, `type SheetState` (`binder/binder.ts`); types from `data/types.ts`.
- Produces:
  ```ts
  export interface SeenSheet {
  	sheet: WithId<ConceptRecord>;
  	subject: WithId<Subject>;
  	chapter: WithId<Chapter>;
  	state: SheetState;
  	openedAt: number; // ms; Infinity while pending (null)
  }
  export function seenSheets(
  	binder: { subjects: WithId<Subject>[]; chapters: WithId<Chapter>[];
  	          sheets: WithId<ConceptRecord>[]; progress: WithId<ProgressRecord>[] },
  	view: Pick<Profile, 'grade' | 'extraSubjects'>
  ): SeenSheet[];                                   // most recently opened first
  export function normalize(text: string): string;  // lower case, no diacritics, single spaces, trimmed
  export function searchText(entry: SeenSheet): string; // sheet title + subject name + chapter title (tags later)
  export function filterSeen(entries: SeenSheet[], query: string, subjectId: string | null): SeenSheet[];
  export function pickRandom<T>(items: T[], random?: () => number): T | null;
  ```

- [ ] **Step 1: Write the failing tests:**
  - `seenSheets`: `keeps only opened sheets of visible subjects and active chapters` (an unopened sheet, a sheet of a `5e` subject not in extras, a sheet in an archived chapter → excluded); `sorts by last opening, pending first` (openedAt 100, 300, `null` → order null, 300, 100); `carries the sheet state` (`readAt` set → `'read'`).
  - `normalize`: `'  Équation   du 1er DEGRÉ '` → `'equation du 1er degre'`.
  - `filterSeen`: `every word must match the sheet, subject or chapter` (query `'fraction maths'` matches sheet « Additionner des fractions » in subject « Maths »; `'fraction histoire'` matches nothing); `ignores accents and case` (`'EQUATION'` finds « Équations »); `empty query keeps everything`; `filters by subject` (`subjectId: 'fr'` keeps only French); `searches raw titles with LaTeX` (`'frac'` finds « $\frac{1}{2}$ »).
  - `pickRandom`: `[]` → `null`; `['a','b','c']` with `() => 0.99` → `'c'`, with `() => 0` → `'a'`.
- [ ] **Step 2: Run** `npx vitest run --project server src/lib/binder/seen.test.ts` — Expected: FAIL (module not found).
- [ ] **Step 3: Implement** in `src/lib/binder/seen.ts` (`normalize` = `normalize('NFD')` + strip `\p{Diacritic}` + lower case + collapse spaces; `filterSeen` splits the normalized query on spaces and requires every word in `normalize(searchText(entry))`).
- [ ] **Step 4: Run** the same command — Expected: all passed.
- [ ] **Step 5: Commit** `git commit -m "feat(binder): seen sheets, search and random pick"`

---

### Task 5: « Mes fiches vues » page

**Files:**
- Create: `src/routes/me/sheets/+page.svelte`
- Modify: `src/routes/+page.svelte` (link), `src/lib/i18n/fr.ts`, `docs/backlog.md`

**Interfaces:**
- Consumes: `seenSheets`, `filterSeen`, `pickRandom` (Task 4); `watchBinder(familyId, ownerId)` (`data/catalog.ts`); `session.childView` (Task 2); `SheetStateBadge`, `SubjectBadge`, `BackLink`, `LoadState`, `renderInline`.

- [ ] **Step 1: French strings**, section `seen`, exact copy: `title: 'Mes fiches vues'`, `search: 'Rechercher une fiche'`, `all: 'Toutes'`, `random: 'Au hasard'`, `empty: "Tu n'as encore ouvert aucune fiche."`, `noMatch: 'Aucune fiche ne correspond.'`, `loadFailed: 'Impossible de charger tes fiches.'`.
- [ ] **Step 2: Page** `/me/sheets` (only when `session.childView`; otherwise a link back home): `BackLink` to home; `h1` + `btn btn-secondary btn-sm` « Au hasard » (`goto` to `/concept/[id]` of `pickRandom(filtered)`, disabled when `filtered` is empty); `input type="search"` (`bind:value={query}`, `w-full`); chips = « Toutes » + one per subject present in the seen list (`btn btn-sm`, active one `btn-active`, subject colour via `SUBJECT_BORDER` / `SUBJECT_TEXT`); list of `a.card` rows: `SubjectBadge` + « matière · chapitre » kicker, `renderInline(sheet.title)`, `SheetStateBadge` when state is `read` or `updated`. Empty states: `empty` when nothing seen, `noMatch` when the filter hides everything.
- [ ] **Step 3: Home link** in the child-view block, next to « Mes remarques », same card style, label `fr.seen.title` (no count: the home does not load the binder a second time).
- [ ] **Step 4: Backlog**: in `docs/backlog.md`, move « Une page avec toutes les fiches déjà vues… » to « Ce qui est fait » (one line), and add the test mode there too.
- [ ] **Step 5: Verify** `npm run check && npm run lint && npm run test` — Expected: all green.
- [ ] **Step 6: Commit** `git commit -m "feat(me): seen sheets page with search, subject chips and random pick"`

---

### Task 6: End-to-end check against the emulators

**Files:** none (fix commits only if something fails).

- [ ] **Step 1:** `npm run emulators` (terminal 1), `npm run dev` (terminal 2, `PUBLIC_USE_EMULATORS=true`).
- [ ] **Step 2:** As a parent: create a child (3e), a subject Maths 3e, import `static/samples/maths-3e-revisions.json` into a chapter.
- [ ] **Step 3:** On the child's page, « Tester comme … » → home shows the banner, the child's binder, no « Espace parent ». Open two sheets, mark one read, write a note. Expected: « Mes fiches vues » lists both (most recent first), search « fraction » and the chips filter, « Au hasard » opens one of the listed sheets.
- [ ] **Step 4:** « Quitter » → the child's page (parent side) shows **no** progress and **no** note from the test; « Remarques des enfants » is unchanged. Re-enter test mode: the test progress is still there. « Remettre à zéro » → « Mes fiches vues » is empty.
- [ ] **Step 5:** Delete the imitated child while test mode is on (other tab) → the banner disappears, home is the parent home, no error.
- [ ] **Step 6:** `npm run verify` — Expected: check, lint, unit and rules tests all pass.
