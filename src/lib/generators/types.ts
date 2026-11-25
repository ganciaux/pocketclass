import type { Grade } from '#lib/data/types.ts';
import type { Random } from '#lib/practice/series.ts';

/**
 * Exercise generators: a `generator` exercise of a sheet makes, at each draw, an ordinary
 * calculation / mcq / true_false with its answer and explanation. Pure modules (unit-tested);
 * the statements are French school content, like the sample sheets.
 */

export type { Random };
export type Difficulty = 1 | 2 | 3;

export interface GeneratorInput {
	difficulty: Difficulty;
	/** From the sheet's JSON; unknown or invalid params are ignored. */
	params: Record<string, unknown>;
}

/** What one draw makes: the type-specific fields of a playable exercise, plus its explanation. */
export type Generated =
	| {
			type: 'calculation';
			statement: string;
			answer: string;
			requireIrreducible?: boolean;
			explanation: string;
	  }
	| { type: 'mcq'; question: string; answer: string; distractors: string[]; explanation: string }
	| { type: 'true_false'; statement: string; answer: boolean; explanation: string };

export const FAMILIES = ['calculation', 'algebra', 'geometry', 'units'] as const;
export type Family = (typeof FAMILIES)[number];

export interface Generator {
	/** Name used in the JSON (`"generator": "units.length"`). */
	id: string;
	family: Family;
	/** Grades the AI prompt offers it to. */
	grades: readonly Grade[];
	/** For the AI prompt (French): what a question asks, per difficulty if useful. */
	label: string;
	/** For the AI prompt (French): accepted params, if any. */
	params?: string;
	generate: (random: Random, input: GeneratorInput) => Generated;
}
