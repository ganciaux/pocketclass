# Tampon « acquise » — plan

> Exécution inline (superpowers:executing-plans), TDD.

**Goal:** the parent stamps a sheet « Acquise » for a child; the child sees it on the sheet, the
chapter and the counters. **Spec:**
[2026-11-24-acquired-stamp-design.md](../specs/2026-11-24-acquired-stamp-design.md).

## Global constraints

- Code in English, UI text in `fr.ts`; child pages read `session.childView`, write on `ownerId`.
- Rules change ⇒ case in `tests/rules/firestore.rules.test.ts`. Writes via `inBackground()`.
- Do not push or deploy.

## Review focus

- A child device must still open / read a sheet whose progress doc carries `acquiredAt`.
- A progress doc created by the stamp alone (no `openedAt`) must not look opened or seen.
- Test mode: the stamp lands on the parent's profile and « Remettre à zéro » clears it.

### Task 1: rules

- Test (rules): child cannot create with `acquiredAt`, cannot set / change / delete it with
  `merge`; child can merge `openedAt` / `readAt` on a stamped doc; parent stamps and unstamps a
  child's doc. Then `firestore.rules`: create keys = 4 fields; update keys + `acquiredAt` and
  `!diff(resource.data).affectedKeys().hasAny(['acquiredAt'])`.
- Commit `feat(rules): only the parent stamps a sheet as acquired`.

### Task 2: pure logic (`binder/binder.ts`, `binder/seen.ts`)

- Tests: `isAcquired`; `sheetState` new when `openedAt` is undefined; `tally` / `tallyBy` count
  `acquired`; `nextUnread` skips acquired sheets; `seenSheets` skips docs without `openedAt`.
- `SheetProgress.openedAt?: Stamp | null`, `acquiredAt?: Stamp | null`; `Tally.acquired`.
- Commit `feat(binder): acquired sheets in states, counts and next sheet`.

### Task 3: data + UI

- `data/progress.ts`: `setAcquired(familyId, profileId, sheet, acquired)` (`serverTimestamp()` /
  `deleteField()`, `inBackground`).
- `AcquiredStamp.svelte` (the stamp), `AcquiredToggles.svelte` (parent card, one toggle per
  child from `watchChildProfiles`, each reading `watchConceptProgress`).
- Sheet page: stamp under the title in child view; test-mode button; parent card otherwise.
- Chapter page: star step + « Acquise » badge. `TallyLine`: « · n acquises ».
- `fr.ts`: `fr.stamp`. Check with `npm run verify` and the browser on the emulators.
- Docs: CLAUDE.md (decision + Firestore model), backlog. Commit `feat(sheet): acquired stamp`.
