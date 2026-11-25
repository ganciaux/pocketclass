import { generatorById } from '#lib/generators/catalog.ts';
import type { Exercise } from '#lib/schemas/common.ts';
import type { PlayableExercise } from './answers.ts';
import { buildSeries, playable, SERIES_SIZE, shuffle, type Random } from './series.ts';

/**
 * Generated questions in practice: a sheet's `generator` exercises make a new question at each
 * draw, which completes a series and feeds the timed challenge. Pure module (unit-tested).
 */

export type GeneratorExercise = Extract<Exercise, { type: 'generator' }>;

/** What a sheet offers to practise: its written exercises and its generators. */
export interface PracticeSet {
	written: PlayableExercise[];
	generators: GeneratorExercise[];
}

type Stored = Exercise & { archived?: boolean };

/** Active practice exercises, split; a generator the app does not know is left out. */
export function practiceSet(exercises: Stored[]): PracticeSet {
	return {
		written: playable(exercises),
		generators: exercises.filter(
			(e): e is GeneratorExercise & { archived?: boolean } =>
				e.type === 'generator' &&
				e.usage === 'practice' &&
				!e.archived &&
				generatorById(e.generator) !== undefined
		)
	};
}

export const isEmpty = (set: PracticeSet) => set.written.length + set.generators.length === 0;

/**
 * One question made by a generator. Its id is `<generator exercise id>~<n>` (`n` counts the
 * draws of this series or challenge), so attempts keep which generator it came from.
 */
export function instantiate(
	exercise: GeneratorExercise,
	n: number,
	random: Random = Math.random
): PlayableExercise {
	// The JSON's explanation (if any) gives way to the one written for this very question.
	const { generator, params, explanation, ...base } = exercise;
	const made = generatorById(generator)!.generate(random, {
		difficulty: exercise.difficulty,
		params
	});
	return { ...base, ...made, id: `${exercise.id}~${n}` } as PlayableExercise;
}

/** What the child reads: two questions with the same text are the same question. */
const promptOf = (e: PlayableExercise) =>
	'statement' in e ? e.statement : 'question' in e ? e.question : e.id;

/**
 * Draws generated questions, avoiding a text already in `seen` (a few tries: a small generator
 * may have few different questions).
 */
export function generatedDraw(random: Random = Math.random) {
	let drawn = 0;
	return (exercise: GeneratorExercise, seen: Set<string>): PlayableExercise => {
		drawn++;
		let question = instantiate(exercise, drawn, random);
		for (let i = 0; i < 5 && seen.has(promptOf(question)); i++) {
			question = instantiate(exercise, drawn, random);
		}
		seen.add(promptOf(question));
		return question;
	};
}

/** A series: written exercises first (usual draw), then generated questions up to `size`. */
export function buildPracticeSeries(
	set: PracticeSet,
	size = SERIES_SIZE,
	random: Random = Math.random
): PlayableExercise[] {
	const series = buildSeries(set.written, size, random);
	const generators = shuffle(set.generators, random);
	const draw = generatedDraw(random);
	const seen = new Set<string>();
	for (let i = 0; generators.length > 0 && series.length < size; i++) {
		series.push(draw(generators[i % generators.length], seen));
	}
	return series;
}
