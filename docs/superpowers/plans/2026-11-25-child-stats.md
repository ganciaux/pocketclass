# Child statistics — implementation plan (short)

Spec: `docs/superpowers/specs/2026-11-25-child-stats-design.md`.

1. **Pure stats** `src/lib/stats/stats.ts` (+ `stats.test.ts`, TDD): `runs(counter, finished)`
   (started is null when the counter is below the finished runs), `sheetStats(progress,
   attempts)`, `groupStats(sheetIds, progressById, attempts)` (read / acquired / failed, opens,
   runs per mode, series average %, challenge best, last activity), `recentAttempts(attempts,
   subjectId, 20)` (newest first, pending on top).
2. **Counters**: `ProgressRecord` gains `openCount`, `seriesStarted`, `challengeStarted`,
   `assessmentStarted`. Rules: `validCounter(field)` = absent, or int equal to the previous
   value or previous + 1 (`resource == null` → 0); rules tests (create 1, +1, +2 refused,
   decrease refused, string refused). `markOpened(…, newVisit)` adds `increment(1)` once per
   sheet shown; `countStart(familyId, profileId, sheet, mode)`; called by the practice (new
   series, not the mistakes replay), challenge and assessment pages.
3. **Data**: `watchAttempts(familyId, profileId)` (cache-first query).
4. **Page** `/parent/stats` (`?child=`, `?subject=`): child chips (+ « Mes tests » when the
   admin has progress), global view (summary strip + one card per visible subject), detailed
   view (per chapter, one row per sheet; « Derniers essais », 20). Links: parent home button,
   child page. French text in `fr.stats`.
5. Docs: CLAUDE.md (Firestore model, decision log, components), backlog. `npm run verify`,
   browser check (parent + test mode), commit per step.
