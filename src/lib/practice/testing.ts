import type { StoredExercise } from './generated.ts';

/** Stored exercises for unit tests (practice, assessment): one place if the format changes. */

export const storedMcq = (id: string, extra: Partial<StoredExercise> = {}) =>
	({
		id,
		usage: 'practice',
		keyPoint: 'kp',
		difficulty: 1,
		type: 'mcq',
		question: `Q ${id}`,
		answer: 'A',
		distractors: ['B', 'C', 'D'],
		archived: false,
		...extra
	}) as StoredExercise;

export const storedGenerator = (id: string, extra: Partial<StoredExercise> = {}) =>
	({
		id,
		usage: 'practice',
		keyPoint: 'kp',
		difficulty: 2,
		type: 'generator',
		generator: 'units.length',
		params: {},
		archived: false,
		...extra
	}) as StoredExercise;
