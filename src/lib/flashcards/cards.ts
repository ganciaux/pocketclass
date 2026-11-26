import type { Flashcard, KeyPoint, SheetSection } from '#lib/schemas/sheet.ts';
import { fr } from '#lib/i18n/fr.ts';

/**
 * Revision cards (« Cartes ») of one sheet, a chapter or a whole binder. Pure module
 * (unit-tested). A sheet's cards are the ones written by the AI (`flashcards`) or, for older
 * sheets, cards built from its key points and pitfalls.
 */

export type CardTag = Flashcard['tag'];
export type Pile = 'known' | 'review';

export interface Card {
	/** `<sheet id>~<hash of the front>`: stays the same if the AI reorders the cards. */
	id: string;
	sheetId: string;
	tag: CardTag;
	front: string;
	/** One or two sentences (or the summary lines of a section). */
	back: string[];
	example?: string;
}

export interface SheetForCards {
	id: string;
	title: string;
	keyPoints: KeyPoint[];
	sheet: { sections: SheetSection[]; pitfalls: string[] };
	flashcards?: Flashcard[];
}

/** Short stable hash (djb2, base 36) of a card's front. */
function hash(text: string): string {
	let h = 5381;
	for (let i = 0; i < text.length; i++) h = (h * 33) ^ text.charCodeAt(i);
	return (h >>> 0).toString(36);
}

/** The cards of a sheet, in its order. */
export function cardsOf(sheet: SheetForCards): Card[] {
	const card = (tag: CardTag, front: string, back: string[], example?: string): Card => ({
		id: `${sheet.id}~${hash(`${tag}:${front}`)}`,
		sheetId: sheet.id,
		tag,
		front,
		back,
		example
	});
	if (sheet.flashcards?.length) {
		return sheet.flashcards.map((c) => card(c.tag, c.front, [c.back], c.example));
	}
	const { sections, pitfalls } = sheet.sheet;
	const fromKeyPoints = sheet.keyPoints.map((kp) => {
		const about = sections.filter((s) => s.keyPoints.includes(kp.id));
		const lines = about.flatMap((s) => s.summary ?? []).slice(0, 3);
		const back = lines.length ? lines : about.slice(0, 1).map((s) => fr.cards.readSection(s.title));
		const first = about.flatMap((s) => s.examples)[0];
		return card('rule', kp.label, back, first && `${first.statement} ${first.solution}`);
	});
	const fromPitfalls = pitfalls.map((p) => card('pitfall', p, [fr.cards.pitfallBack]));
	return [...fromKeyPoints, ...fromPitfalls];
}

/** The cards of several sheets, one sheet after the other. */
export const deckOf = (sheets: SheetForCards[]) => sheets.flatMap(cardsOf);

/** Where each card was sorted, from the progress documents (« à revoir » wins a conflict). */
export function pilesOf(
	progress: Iterable<{ cardsKnown?: string[]; cardsReview?: string[] }>
): Map<string, Pile> {
	const piles = new Map<string, Pile>();
	const list = [...progress];
	for (const p of list) for (const id of p.cardsKnown ?? []) piles.set(id, 'known');
	for (const p of list) for (const id of p.cardsReview ?? []) piles.set(id, 'review');
	return piles;
}

export function countPiles(deck: Card[], piles: ReadonlyMap<string, Pile>) {
	const known = deck.filter((c) => piles.get(c.id) === 'known').length;
	const review = deck.filter((c) => piles.get(c.id) === 'review').length;
	return { known, review, unsorted: deck.length - known - review };
}

/** The cards to play: all of them, or only the ones to review. */
export const visibleCards = (
	deck: Card[],
	piles: ReadonlyMap<string, Pile>,
	onlyReview: boolean
) => (onlyReview ? deck.filter((c) => piles.get(c.id) === 'review') : deck);
