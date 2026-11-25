import { describe, expect, it } from 'vitest';
import { challengePool, challengeQueue, newRecord } from './challenge.ts';

const ex = (id: string, type = 'mcq') => ({ id, type });

describe('challengePool', () => {
	it('keeps the quick types only', () => {
		const pool = challengePool([
			ex('a'),
			ex('b', 'true_false'),
			ex('c', 'calculation'),
			ex('d', 'match'),
			ex('e', 'paper')
		]);
		expect(pool.map((e) => e.id)).toEqual(['a', 'b', 'c']);
	});
});

describe('challengeQueue', () => {
	it('goes through the whole pool before repeating, never twice in a row', () => {
		const pool = [ex('a'), ex('b'), ex('c')];
		const next = challengeQueue(pool);
		const drawn = Array.from({ length: 30 }, () => next()!.id);
		expect(new Set(drawn.slice(0, 3)).size).toBe(3);
		expect(new Set(drawn.slice(3, 6)).size).toBe(3);
		drawn.forEach((id, i) => i > 0 && expect(id).not.toBe(drawn[i - 1]));
	});

	it('repeats a single question and returns null for an empty pool', () => {
		const one = challengeQueue([ex('a')]);
		expect([one()!.id, one()!.id]).toEqual(['a', 'a']);
		expect(challengeQueue([])()).toBeNull();
	});
});

describe('newRecord', () => {
	it('keeps the highest count of right answers', () => {
		expect(newRecord(undefined, 5)).toBe(5);
		expect(newRecord(8, 5)).toBe(8);
		expect(newRecord(8, 9)).toBe(9);
	});
});
