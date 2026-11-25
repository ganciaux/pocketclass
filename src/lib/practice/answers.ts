import { equals, isIrreducible, parseFraction } from '#lib/math/fraction.ts';
import type { Exercise } from '#lib/schemas/common.ts';

/**
 * Answer checking for every exercise type the player shows. Pure module (unit-tested).
 * Typed answers are compared leniently (case, accents, spaces, final punctuation) and numbers by
 * value, but a wrong value is never accepted.
 */

/** An exercise the player can show (generators come later). */
export type PlayableExercise = Exclude<Exercise, { type: 'generator' }>;
export type PlayableType = PlayableExercise['type'];

/** What the child gives for each type. Lists follow the exercise's own order. */
export interface Responses {
	mcq: string;
	true_false: boolean;
	calculation: string;
	cloze: string[];
	open: string;
	/** The items in the order the child put them. */
	ordering: string[];
	/** For each pair (exercise order), the `right` the child linked to its `left`. */
	match: string[];
	/** For each item (exercise order), the category the child chose. */
	categorize: string[];
	/** Self-assessed: « je savais » / « je ne savais pas ». */
	pair: boolean;
	paper: boolean;
}

export type ResponseOf<E extends PlayableExercise> = Responses[E['type']];

/** Lower case, no accents, single spaces, straight apostrophes, no final punctuation. */
export function normalizeText(value: string): string {
	return value
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.replace(/[’‘`]/g, "'")
		.toLowerCase()
		.replace(/\s+/g, ' ')
		.trim()
		.replace(/[\s.!?;:]+$/, '');
}

/** Same text (leniently), or two numbers / fractions of the same value. */
export function sameAnswer(given: string, expected: string): boolean {
	if (normalizeText(given) === normalizeText(expected)) return true;
	const a = parseFraction(given);
	const b = parseFraction(expected);
	return !!a && !!b && equals(a, b);
}

const BLANK = /\[\[(.*?)\]\]/g;

/** A cloze text cut into plain text and numbered blanks. */
export function clozeParts(text: string): ({ text: string } | { blank: number })[] {
	const parts: ({ text: string } | { blank: number })[] = [];
	let last = 0;
	let blank = 0;
	for (const match of text.matchAll(BLANK)) {
		if (match.index > last) parts.push({ text: text.slice(last, match.index) });
		parts.push({ blank: blank++ });
		last = match.index + match[0].length;
	}
	if (last < text.length) parts.push({ text: text.slice(last) });
	return parts;
}

export const clozeAnswers = (text: string) => [...text.matchAll(BLANK)].map((m) => m[1].trim());

const sameList = (given: string[], expected: string[]) =>
	given.length === expected.length && given.every((value, i) => value === expected[i]);

function checkCalculation(exercise: Extract<Exercise, { type: 'calculation' }>, given: string) {
	const value = parseFraction(given);
	const expected = parseFraction(exercise.answer);
	if (!value || !expected || !equals(value, expected)) return false;
	// Irreducibility is about a written fraction: a decimal (« 2,5 ») has nothing to simplify.
	return !exercise.requireIrreducible || !given.includes('/') || isIrreducible(value);
}

/** True when `response` is the right answer to `exercise`. */
export function checkAnswer<E extends PlayableExercise>(exercise: E, response: ResponseOf<E>) {
	// One branch per type; `response` matches the type by construction (Responses).
	const r = response as never;
	switch (exercise.type) {
		case 'mcq':
			return r === exercise.answer;
		case 'true_false':
			return r === exercise.answer;
		case 'calculation':
			return checkCalculation(exercise, r);
		case 'cloze': {
			const expected = clozeAnswers(exercise.text);
			const given = r as string[];
			return given.length === expected.length && given.every((g, i) => sameAnswer(g, expected[i]));
		}
		case 'open':
			return exercise.answers.some((answer) => sameAnswer(r, answer));
		case 'ordering':
			return sameList(r, exercise.items);
		case 'match':
			return sameList(
				r,
				exercise.pairs.map((p) => p.right)
			);
		case 'categorize':
			return sameList(
				r,
				exercise.items.map((item) => item.category)
			);
		case 'pair':
		case 'paper':
			return r === true;
	}
}
