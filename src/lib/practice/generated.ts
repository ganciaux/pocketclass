import { generatorById } from '#lib/generators/catalog.ts';
import type { Exercise } from '#lib/schemas/common.ts';
import { exercisePrompt, type PlayableExercise } from './answers.ts';
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

/** An exercise as stored: flat, with `archived`. */
export type StoredExercise = Exercise & { archived?: boolean };

/** Active generators the app knows (a name missing from the catalogue is left out). */
export const knownGenerators = (exercises: StoredExercise[]) =>
	exercises.filter(
		(e): e is GeneratorExercise & { archived?: boolean } =>
			e.type === 'generator' && !e.archived && generatorById(e.generator) !== undefined
	);

/** Active practice exercises, split into written ones and generators. */
export function practiceSet(exercises: StoredExercise[]): PracticeSet {
	return {
		written: playable(exercises),
		generators: knownGenerators(exercises).filter((g) => g.usage === 'practice')
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

/**
 * Draws generated questions, avoiding a text already in `seen` (a few tries: a small generator
 * may have few different questions).
 */
export function generatedDraw(random: Random = Math.random) {
	let drawn = 0;
	return (exercise: GeneratorExercise, seen: Set<string>): PlayableExercise => {
		drawn++;
		let question = instantiate(exercise, drawn, random);
		for (let i = 0; i < 5 && seen.has(exercisePrompt(question)); i++) {
			question = instantiate(exercise, drawn, random);
		}
		seen.add(exercisePrompt(question));
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
