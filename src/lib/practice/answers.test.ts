import { describe, expect, it } from 'vitest';
import type { Exercise } from '#lib/schemas/common.ts';
import { checkAnswer, clozeAnswers, clozeParts, normalizeText, sameAnswer } from './answers.ts';

const base = { id: 'x', usage: 'practice', keyPoint: 'kp', difficulty: 1 } as const;
const ex = <E extends Exercise>(fields: Omit<E, keyof typeof base>) =>
	({ ...base, ...fields }) as E;

describe('normalizeText', () => {
	it('ignores case, accents, extra spaces, curly quotes and final punctuation', () => {
		expect(normalizeText('  Élève   DÉJÀ là ! ')).toBe('eleve deja la');
		expect(normalizeText('l’hypoténuse.')).toBe("l'hypotenuse");
	});
});

describe('sameAnswer', () => {
	it('compares texts leniently and numbers by value', () => {
		expect(sameAnswer('Mangeons', 'mangeons.')).toBe(true);
		expect(sameAnswer('3 / 2', '3/2')).toBe(true);
		expect(sameAnswer('0,5', '1/2')).toBe(true);
		expect(sameAnswer('mange', 'mangeons')).toBe(false);
		expect(sameAnswer('2/3', '3/2')).toBe(false);
	});
});

describe('cloze', () => {
	it('splits the text into parts and blanks, and lists the answers', () => {
		const text = 'Nous [[mangeons]] et vous [[mangez]].';
		expect(clozeParts(text)).toEqual([
			{ text: 'Nous ' },
			{ blank: 0 },
			{ text: ' et vous ' },
			{ blank: 1 },
			{ text: '.' }
		]);
		expect(clozeAnswers(text)).toEqual(['mangeons', 'mangez']);
	});
});

describe('checkAnswer', () => {
	it('mcq and true/false', () => {
		const mcq = ex<Extract<Exercise, { type: 'mcq' }>>({
			type: 'mcq',
			question: 'Q',
			answer: 'A',
			distractors: ['B', 'C', 'D']
		});
		expect(checkAnswer(mcq, 'A')).toBe(true);
		expect(checkAnswer(mcq, 'B')).toBe(false);
		const tf = ex<Extract<Exercise, { type: 'true_false' }>>({
			type: 'true_false',
			statement: 'S',
			answer: false
		});
		expect(checkAnswer(tf, false)).toBe(true);
		expect(checkAnswer(tf, true)).toBe(false);
	});

	it('calculation: by value, irreducible when required, rejects garbage', () => {
		const calc = ex<Extract<Exercise, { type: 'calculation' }>>({
			type: 'calculation',
			statement: 'S',
			answer: '2/3',
			requireIrreducible: true
		});
		expect(checkAnswer(calc, '2/3')).toBe(true);
		expect(checkAnswer(calc, ' 2 / 3 ')).toBe(true);
		expect(checkAnswer(calc, '4/6')).toBe(false);
		expect(checkAnswer(calc, 'deux tiers')).toBe(false);
		expect(checkAnswer({ ...calc, requireIrreducible: false }, '4/6')).toBe(true);
		expect(checkAnswer({ ...calc, answer: 2.5 }, '2,5')).toBe(true);
		expect(checkAnswer({ ...calc, answer: 2.5 }, '5/2')).toBe(true);
	});

	it('cloze: every blank must match', () => {
		const cloze = ex<Extract<Exercise, { type: 'cloze' }>>({
			type: 'cloze',
			text: 'Nous [[mangeons]] et vous [[mangez]].'
		});
		expect(checkAnswer(cloze, ['Mangeons', 'mangez'])).toBe(true);
		expect(checkAnswer(cloze, ['mangeons', 'mangons'])).toBe(false);
		expect(checkAnswer(cloze, ['mangeons'])).toBe(false);
	});

	it('open: any accepted answer', () => {
		const open = ex<Extract<Exercise, { type: 'open' }>>({
			type: 'open',
			question: 'Q',
			answers: ['hypoténuse', "l'hypoténuse"]
		});
		expect(checkAnswer(open, 'Hypotenuse')).toBe(true);
		expect(checkAnswer(open, 'côté')).toBe(false);
	});

	it('ordering, match and categorize compare position by position', () => {
		const ordering = ex<Extract<Exercise, { type: 'ordering' }>>({
			type: 'ordering',
			instruction: 'I',
			items: ['a', 'b', 'c']
		});
		expect(checkAnswer(ordering, ['a', 'b', 'c'])).toBe(true);
		expect(checkAnswer(ordering, ['b', 'a', 'c'])).toBe(false);

		const match = ex<Extract<Exercise, { type: 'match' }>>({
			type: 'match',
			pairs: [
				{ left: '1', right: 'un' },
				{ left: '2', right: 'deux' }
			]
		});
		expect(checkAnswer(match, ['un', 'deux'])).toBe(true);
		expect(checkAnswer(match, ['deux', 'un'])).toBe(false);

		const categorize = ex<Extract<Exercise, { type: 'categorize' }>>({
			type: 'categorize',
			categories: ['Pair', 'Impair'],
			items: [
				{ text: '2', category: 'Pair' },
				{ text: '3', category: 'Impair' }
			]
		});
		expect(checkAnswer(categorize, ['Pair', 'Impair'])).toBe(true);
		expect(checkAnswer(categorize, ['Pair', 'Pair'])).toBe(false);
	});

	it('pair and paper are self-assessed', () => {
		const pair = ex<Extract<Exercise, { type: 'pair' }>>({
			type: 'pair',
			front: 'F',
			back: 'B',
			direction: 'front_to_back'
		});
		expect(checkAnswer(pair, true)).toBe(true);
		expect(checkAnswer(pair, false)).toBe(false);
	});
});
