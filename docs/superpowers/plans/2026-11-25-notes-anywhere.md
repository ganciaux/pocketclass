# Remarque n'importe où — plan

> Exécution inline (superpowers:executing-plans), TDD.

**Goal:** a floating « Une difficulté ? » button on every child page, notes attached to the
page's chapter / subject or free. **Spec:**
[2026-11-25-notes-anywhere-design.md](../specs/2026-11-25-notes-anywhere-design.md).

## Global constraints

- Code in English, UI text in `fr.ts`; child pages read `session.childView`, write on `ownerId`.
- Rules change ⇒ case in `tests/rules/firestore.rules.test.ts`. Child writes via `inBackground()`.
- Old notes (`conceptId` + `chapterId` strings, no `subjectId`) keep working. No push, no deploy.

## Review focus

- Old notes still display with their sheet link; the child can still edit them (rules update).
- A chapter-level note survives nothing it should not: deleting its chapter or subject removes it.
- The button never covers the last control of a page (bottom padding) nor the update toast.

### Task 1: rules

- Tests: child creates a free note (all ids null), a chapter note, a subject note; rejects a
  non-string id and an unknown key. Rules: keys + `subjectId`, `nullableString` helper.
- Commit `feat(rules): notes on a chapter, a subject or free`.

### Task 2: pure (`notes/notes.ts`)

- `noteContext(routeId: string | null, params): NoteContext | null` and
  `notePlace(note, { sheets, chapters, subjects }): NotePlace`. Tests first.
- Commit `feat(notes): note context from the page and place of a note`.

### Task 3: data + UI

- `Note` / `NoteTarget` types (nullable ids, `subjectId`); `addNote` writes `subjectId`.
- `catalogDelete.ts`: chapter / subject deletions also take their notes.
- `NoteFab.svelte` (button + modal, in the root layout), `NoteList` shows `notePlace`;
  `ProfileNotes` loads chapters and subjects. Concept page passes `subjectId`.
- `fr.ts`, CLAUDE.md, backlog. Verify + browser. Commit `feat(notes): a note from any child page`.
