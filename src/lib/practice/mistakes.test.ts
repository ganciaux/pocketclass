import { describe, expect, it } from 'vitest';
import {
	buildReview,
	dueMistakes,
	mistakes,
	reviewable,
	sheetsWithMistakes,
	storedId,
	type MistakeAttempt
} from './mistakes.ts';
import { storedGenerator, storedMcq } from './testing.ts';

const at = (ms: number) => ({ toMillis: () => ms });
const DAY = 24 * 3600_000;
const run = (
	time: number | null,
	answers: [string, boolean][],
	conceptId = 'fractions'
): MistakeAttempt => ({
	conceptId,
	mode: 'series',
	answers: answers.map(([exerciseId, correct]) => ({ exerciseId, correct })),
	createdAt: time === null ? null : at(time)
});

describe('mistakes', () => {
	it('a mistake comes back the next day, then 3 days after a right answer, then is done', () => {
		const wrong = [run(0, [['q1', false]])];
		expect(mistakes(wrong, 10)).toEqual([
			{ conceptId: 'fractions', exerciseId: 'q1', rights: 0, dueAt: DAY }
		]);
		const once = [...wrong, run(2 * DAY, [['q1', true]])];
		expect(mistakes(once, 3 * DAY)).toMatchObject([{ rights: 1, dueAt: 5 * DAY }]);
		expect(mistakes([...once, run(6 * DAY, [['q1', true]])], 7 * DAY)).toEqual([]);
	});

	it('ignores right answers before a mistake, restarts after a new one', () => {
		const list = mistakes(
			[
				run(0, [['q1', true]]),
				run(DAY, [['q1', false]]),
				run(2 * DAY, [['q1', true]]),
				run(3 * DAY, [['q1', false]])
			],
			4 * DAY
		);
		expect(list).toMatchObject([{ exerciseId: 'q1', rights: 0, dueAt: 4 * DAY }]);
	});

	it('groups a generated question with its generator, per sheet; pending runs are now', () => {
		const list = mistakes(
			[run(null, [['gen-1~3', false]]), run(0, [['gen-1~1', false]], 'powers')],
			100
		);
		expect(list.map((m) => [m.conceptId, m.exerciseId, m.dueAt])).toEqual([
			['powers', 'gen-1', DAY],
			['fractions', 'gen-1', 100 + DAY]
		]);
		expect(storedId('q1')).toBe('q1');
	});

	it('lists what is due, longest waiting first, and the next one later', () => {
		const list = mistakes(
			[run(0, [['a', false]]), run(DAY, [['b', false]]), run(5 * DAY, [['c', false]])],
			3 * DAY
		);
		const { due, nextAt } = dueMistakes(list, 3 * DAY);
		expect(due.map((m) => m.exerciseId)).toEqual(['a', 'b']);
		expect(nextAt).toBe(6 * DAY);
	});
});

describe('buildReview', () => {
	it('plays existing practice questions and new generated ones, never assessment ones', () => {
		const list = mistakes(
			[
				run(0, [
					['q1', false],
					['gen~2', false],
					['exam', false],
					['gone', false],
					['old', false]
				])
			],
			2 * DAY
		);
		const exercises = new Map([
			[
				'fractions',
				[
					storedMcq('q1'),
					storedGenerator('gen'),
					storedMcq('exam', { usage: 'assessment' }),
					storedMcq('old', { archived: true })
				]
			]
		]);
		const items = reviewable(dueMistakes(list, 2 * DAY).due, exercises);
		expect(items.map((m) => m.exerciseId)).toEqual(['q1', 'gen']);
		expect(sheetsWithMistakes(list)).toEqual(['fractions']);
		const review = buildReview(items);
		expect(review.map((q) => q.exercise.id).sort()).toEqual(['gen~r', 'q1']);
		expect(review.every((q) => q.conceptId === 'fractions')).toBe(true);
		expect(review.find((q) => q.exercise.id === 'gen~r')?.exercise.type).not.toBe('generator');
	});
});
