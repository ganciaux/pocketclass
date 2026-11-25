import { describe, expect, it } from 'vitest';
import {
	betterScore,
	buildSeries,
	playable,
	scoreOf,
	scramble,
	shuffle,
	wrongIds
} from './series.ts';

/** Deterministic "random" numbers for the tests. */
function seeded(seed = 1) {
	let s = seed;
	return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

const ex = (id: string, keyPoint: string, extra: Record<string, unknown> = {}) => ({
	id,
	keyPoint,
	usage: 'practice' as const,
	type: 'mcq' as const,
	archived: false,
	...extra
});

describe('playable', () => {
	it('keeps active practice exercises that the player can show', () => {
		const list = [
			ex('a', 'kp1'),
			ex('b', 'kp1', { usage: 'assessment' }),
			ex('c', 'kp1', { type: 'generator' }),
			ex('d', 'kp1', { archived: true })
		];
		expect(playable(list).map((e) => e.id)).toEqual(['a']);
	});
});

describe('shuffle', () => {
	it('keeps every item and does not change the input', () => {
		const items = [1, 2, 3, 4, 5];
		const mixed = shuffle(items, seeded());
		expect([...mixed].sort()).toEqual(items);
		expect(items).toEqual([1, 2, 3, 4, 5]);
	});
});

describe('scramble', () => {
	it('never returns the original order when there is more than one item', () => {
		const identity = () => 0.999; // Fisher–Yates with j = i: nothing moves
		expect(scramble(['a', 'b', 'c'], identity)).toEqual(['b', 'c', 'a']);
		expect(scramble(['a'], identity)).toEqual(['a']);
	});
});

describe('buildSeries', () => {
	const list = [
		ex('a1', 'kp-a'),
		ex('a2', 'kp-a'),
		ex('a3', 'kp-a'),
		ex('a4', 'kp-a'),
		ex('b1', 'kp-b'),
		ex('c1', 'kp-c'),
		ex('c2', 'kp-c')
	];

	it('takes at most `size` distinct exercises, key points in turn', () => {
		const series = buildSeries(list, 5, seeded(3));
		expect(series).toHaveLength(5);
		expect(new Set(series.map((e) => e.id)).size).toBe(5);
		// The first three cover the three key points.
		expect(new Set(series.slice(0, 3).map((e) => e.keyPoint))).toEqual(
			new Set(['kp-a', 'kp-b', 'kp-c'])
		);
		// kp-b has one exercise only: it is not repeated.
		expect(series.filter((e) => e.keyPoint === 'kp-b')).toHaveLength(1);
	});

	it('uses everything when there are fewer exercises than `size`, even one', () => {
		expect(buildSeries(list, 10, seeded())).toHaveLength(7);
		expect(buildSeries([ex('x', 'kp')], 10, seeded())).toHaveLength(1);
		expect(buildSeries([], 10, seeded())).toEqual([]);
	});
});

describe('scores', () => {
	const results = [
		{ exerciseId: 'a', correct: true },
		{ exerciseId: 'b', correct: false },
		{ exerciseId: 'c', correct: true }
	];

	it('counts correct answers and lists the wrong ones', () => {
		expect(scoreOf(results)).toEqual({ correct: 2, total: 3 });
		expect(wrongIds(results)).toEqual(['b']);
	});

	it('keeps the better score: higher rate, then longer series', () => {
		expect(betterScore(null, { correct: 1, total: 4 })).toEqual({ correct: 1, total: 4 });
		expect(betterScore({ correct: 3, total: 4 }, { correct: 2, total: 4 })).toEqual({
			correct: 3,
			total: 4
		});
		expect(betterScore({ correct: 2, total: 2 }, { correct: 8, total: 8 })).toEqual({
			correct: 8,
			total: 8
		});
		expect(betterScore({ correct: 9, total: 10 }, { correct: 5, total: 5 })).toEqual({
			correct: 5,
			total: 5
		});
	});
});
