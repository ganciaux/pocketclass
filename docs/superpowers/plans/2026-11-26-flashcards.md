# Flashcards — implementation plan (short)

Spec: `docs/superpowers/specs/2026-11-26-flashcards-design.md`.

1. **Format** (TDD): `flashcards` in `sheet@1` (`FLASHCARD_TAGS`, ≤ 20 cards, front ≤ 160,
   back ≤ 300, example ≤ 200), stored by the import, exported, asked by the prompt (8–15 cards,
   2–3 pitfalls, check each answer), sample sheet, JSON Schemas.
2. **Pure deck** `src/lib/flashcards/cards.ts` (+ tests): `cardsOf(sheet)` (AI cards or
   fallback: one « rule » card per key point with its section summaries, one « pitfall » per
   pitfall; id `<sheet>~<hash of the front>`), `deckOf(sheets)`, `pileOf`, `countPiles`,
   `visibleCards(deck, piles, onlyReview)`.
3. **Saving**: `ProgressRecord.cardsKnown` / `cardsReview` (≤ 50 ids each, rules + test),
   `sortCard(familyId, profileId, sheet, cardId, pile)` with `arrayUnion` / `arrayRemove`.
4. **UI**: `<FlashcardDeck>` (bristol card, 3D flip, reduced motion fade, keyboard, piles,
   counters, shuffle, only-to-review, end summary); routes `/concept/[id]/cards`,
   `/chapter/[id]/cards`, `/subject/[id]/cards`; buttons on the sheet, chapter and subject
   pages. French text in `fr.cards`.
5. Docs (CLAUDE.md, backlog), `npm run verify`, browser check (parent + test mode).
