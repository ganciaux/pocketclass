# Sheet Tags Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Optional AI-written tags on sheets, stored on import, searched in « Mes fiches vues », shown (and linked in child view) on the sheet page.

**Spec:** [docs/superpowers/specs/2026-11-24-sheet-tags-design.md](../specs/2026-11-24-sheet-tags-design.md)

## Global Constraints

Code in English, UI text in `fr.ts`; pure modules unit-tested; `npm run schemas` after a schema change; no rules change.

## Review Focus

1. Old JSON without `tags` still imports (default `[]`) — Task 1 test.
2. Messy AI tags (spaces, case/accent duplicates, empty strings) — Task 1 tests.
3. Stored sheets without `tags` (imported before) — `searchText` and the sheet page treat them as `[]` — Task 2 test.
4. A tag with spaces or accents in the `q` URL parameter — encoded by `resolve`/`URLSearchParams` — Task 3.

### Task 1: Schema + prompt + import plan
- Test (`sheet.test.ts`): `defaults tags to an empty list`; `trims tags and drops duplicates ignoring case and accents` (`[' Fraction ', 'fraction', 'Fractión', 'COD']` → `['Fraction', 'COD']`); `rejects more than 10 tags or a tag over 30 characters` (errors non-empty).
- Test (`sheetPrompt.test.ts`): the sheet prompt mentions `"tags"`.
- Test (`sheetPlan.test.ts`): the concept write carries `tags` from the JSON.
- Implement: `tags` in `sheetBodySchema` (`z.array(text.max(30)).max(10).default([]).transform(dedupe)`, dedupe key = NFD lower-case without diacritics), `ConceptRecord.tags?: string[]`, `tags: sheet.tags` in `sheetPlan`, prompt shape + rule. Run `npm run schemas`.
- Commit `feat(sheets): optional tags in the sheet format, prompt and import`.

### Task 2: Search
- Test (`seen.test.ts`): `searches the sheet tags` (a sheet with `tags: ['dénominateur']` found by `'denominateur'`); `a sheet without tags is still searchable`.
- Implement: `SheetLike.tags?: string[]`; `searchText` appends `entry.sheet.tags ?? []`.
- Commit `feat(binder): search sheet tags`.

### Task 3: Sheet page + `q` parameter
- `fr.concept.tags: 'Mots-clés'`. Concept page: under the title, `badge badge-outline` per tag; in child view an `a` to `resolve('/me/sheets') + '?q=' + encodeURIComponent(tag)`. Seen page: initial `query` from `page.url.searchParams.get('q') ?? ''`.
- Verify `npm run check && npm run lint && npm run test`; e2e on the emulators (sheet with tags → badges → tap → seen page filtered).
- `CLAUDE.md` decisions-log entry, `docs/backlog.md` (tags done). Commit `feat(sheet): tags on the sheet page, linked to the seen sheets search`.
