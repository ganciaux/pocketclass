import { describe, expect, it } from 'vitest';
import { cardsOf, countPiles, deckOf, pilesOf, visibleCards, type SheetForCards } from './cards.ts';

const sheet = (id: string, extra: Partial<SheetForCards> = {}): SheetForCards => ({
	id,
	title: `Fiche ${id}`,
	keyPoints: [
		{ id: 'kp-a', label: 'Simplifier une fraction' },
		{ id: 'kp-b', label: 'Additionner' }
	],
	sheet: {
		sections: [
			{
				title: 'Simplifier',
				text: '…',
				summary: ['Diviser en haut et en bas', 'Par le même nombre'],
				examples: [{ statement: 'Simplifier $\\frac{6}{8}$.', solution: '$\\frac{3}{4}$' }],
				keyPoints: ['kp-a']
			},
			{ title: 'Additionner', text: '…', examples: [], keyPoints: ['kp-b'] }
		],
		pitfalls: ['Additionner les dénominateurs']
	},
	...extra
});

describe('cardsOf', () => {
	it('uses the cards written by the AI, with ids stable when their order changes', () => {
		const flashcards = [
			{ tag: 'definition' as const, front: 'Irréductible ?', back: 'Plus simplifiable.' },
			{ tag: 'pitfall' as const, front: '1/2 + 1/3 = 2/5 ?', back: 'Faux.', example: '5/6' }
		];
		const cards = cardsOf(sheet('s1', { flashcards }));
		expect(cards.map((c) => [c.tag, c.front, c.back, c.example])).toEqual([
			['definition', 'Irréductible ?', ['Plus simplifiable.'], undefined],
			['pitfall', '1/2 + 1/3 = 2/5 ?', ['Faux.'], '5/6']
		]);
		expect(cards.every((c) => c.sheetId === 's1' && c.id.startsWith('s1~'))).toBe(true);
		const swapped = cardsOf(sheet('s1', { flashcards: [...flashcards].reverse() }));
		expect(swapped.map((c) => c.id)).toEqual(cards.map((c) => c.id).reverse());
	});

	it('builds cards from the key points and pitfalls when the sheet has none', () => {
		const cards = cardsOf(sheet('s1'));
		expect(cards.map((c) => [c.tag, c.front])).toEqual([
			['rule', 'Simplifier une fraction'],
			['rule', 'Additionner'],
			['pitfall', 'Additionner les dénominateurs']
		]);
		expect(cards[0].back).toEqual(['Diviser en haut et en bas', 'Par le même nombre']);
		expect(cards[0].example).toBe('Simplifier $\\frac{6}{8}$. $\\frac{3}{4}$');
		// No summary: the back points to the section to read again.
		expect(cards[1].back).toEqual(['Relis la partie « Additionner ».']);
		expect(new Set(cards.map((c) => c.id)).size).toBe(3);
	});
});

describe('piles', () => {
	const deck = deckOf([sheet('s1'), sheet('s2')]);
	const [a, b, c] = deck;

	it('puts the sheets one after the other', () => {
		expect(deck.length).toBe(6);
		expect(deck.slice(0, 3).every((card) => card.sheetId === 's1')).toBe(true);
	});

	it('reads the piles of every progress document, « à revoir » winning a conflict', () => {
		const piles = pilesOf([
			{ cardsKnown: [a.id, b.id] },
			{ cardsKnown: [c.id], cardsReview: [b.id] },
			{}
		]);
		expect(piles.get(a.id)).toBe('known');
		expect(piles.get(b.id)).toBe('review');
		expect(piles.get('nope')).toBeUndefined();
	});

	it('counts the piles of a deck and filters the cards to review', () => {
		const piles = new Map([
			[a.id, 'known' as const],
			[b.id, 'review' as const],
			['other~x', 'review' as const]
		]);
		expect(countPiles(deck, piles)).toEqual({ known: 1, review: 1, unsorted: 4 });
		expect(visibleCards(deck, piles, false)).toEqual(deck);
		expect(visibleCards(deck, piles, true)).toEqual([b]);
	});
});
