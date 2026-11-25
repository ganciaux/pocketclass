import type { Generated } from './types.ts';

/** Builders for the exercises a generator makes, and params helpers. */

export const calculation = (
	statement: string,
	answer: string,
	explanation: string,
	requireIrreducible?: boolean
): Generated => ({
	type: 'calculation',
	statement,
	answer,
	explanation,
	...(requireIrreducible ? { requireIrreducible } : {})
});

export const trueFalse = (statement: string, answer: boolean, explanation: string): Generated => ({
	type: 'true_false',
	statement,
	answer,
	explanation
});

/**
 * An MCQ whose distractors are the first 3 candidates that differ from the answer and from each
 * other (put the most typical mistakes first). Not enough candidates is a generator bug: it
 * throws, and the catalogue tests catch it.
 */
export function mcq(
	question: string,
	answer: string,
	candidates: string[],
	explanation: string
): Generated {
	const distractors: string[] = [];
	for (const candidate of candidates) {
		if (candidate !== answer && !distractors.includes(candidate)) distractors.push(candidate);
		if (distractors.length === 3)
			return { type: 'mcq', question, answer, distractors, explanation };
	}
	throw new Error(`Not enough distractors for: ${question}`);
}

/**
 * The values of `all` listed in `params[key]`, in `all` order; all of them when the param is
 * missing, not a list, or keeps fewer than `min` known values.
 */
export function allowed<T extends string>(
	params: Record<string, unknown>,
	key: string,
	all: readonly T[],
	min = 1
): T[] {
	const value = params[key];
	if (!Array.isArray(value)) return [...all];
	const chosen = all.filter((item) => value.includes(item));
	return chosen.length >= min ? chosen : [...all];
}
