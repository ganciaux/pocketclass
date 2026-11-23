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
npm run build        # static build into build/
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
