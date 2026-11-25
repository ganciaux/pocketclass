import { describe, expect, it } from 'vitest';
import { checkAnswer, type PlayableExercise } from '#lib/practice/answers.ts';
import { exerciseSchema } from '#lib/schemas/common.ts';
import { GENERATORS, generatorById, generatorsForGrade } from './catalog.ts';
import { seeded } from './random.ts';
import type { Difficulty } from './types.ts';

const DRAWS = 300;
const EXPONENT = /\d[eE][-+]?\d/;
const BROKEN = /NaN|undefined|Infinity|\bnull\b|\[object/;

/** Every string of a generated exercise (statement, answers, options, explanation). */
const textsOf = (value: object) =>
	Object.values(value)
		.flat()
		.filter((v): v is string => typeof v === 'string');

describe('catalogue', () => {
	it('has unique ids, each in a known grade', () => {
		const ids = GENERATORS.map((g) => g.id);
		expect(new Set(ids).size).toBe(ids.length);
		for (const g of GENERATORS) expect(g.grades.length).toBeGreaterThan(0);
		expect(generatorById('fractions.add')?.family).toBe('calculation');
		expect(generatorById('nope')).toBeUndefined();
		expect(generatorsForGrade('6e').map((g) => g.id)).not.toContain('powers.rules');
	});
});

describe.each(GENERATORS.map((g) => [g.id, g] as const))('%s', (_, generator) => {
	it.each([1, 2, 3] as Difficulty[])(
		'makes valid, right exercises at difficulty %i',
		(difficulty) => {
			const random = seeded(difficulty * 1000 + 7);
			for (let i = 0; i < DRAWS; i++) {
				const generated = generator.generate(random, { difficulty, params: {} });
				for (const text of textsOf(generated)) {
					expect(text).not.toMatch(EXPONENT);
					expect(text).not.toMatch(BROKEN);
				}
				const exercise = exerciseSchema.parse({
					id: 'gen',
					usage: 'practice',
					keyPoint: 'kp',
					difficulty,
					...generated
				}) as PlayableExercise;
				if (generated.type === 'mcq') {
					expect(new Set([generated.answer, ...generated.distractors]).size).toBe(4);
				}
				if (generated.type === 'calculation') {
					expect(checkAnswer(exercise, generated.answer)).toBe(true);
				}
			}
		}
	);
});
