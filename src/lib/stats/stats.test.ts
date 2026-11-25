import { describe, expect, it } from 'vitest';
import { groupStats, recentAttempts, runs, type StatsAttempt } from './stats.ts';

const at = (ms: number) => ({ toMillis: () => ms });

const attempt = (
	conceptId: string,
	mode: StatsAttempt['mode'],
	correct: number,
	total: number,
	ms: number | null,
	subjectId = 'maths'
): StatsAttempt => ({
	conceptId,
	subjectId,
	mode,
	correct,
	total,
	createdAt: ms === null ? null : at(ms)
});

describe('runs', () => {
	it('gives started when the counter covers the finished runs', () => {
		expect(runs(5, 3)).toEqual({ started: 5, finished: 3 });
		expect(runs(3, 3)).toEqual({ started: 3, finished: 3 });
		expect(runs(0, 0)).toEqual({ started: 0, finished: 0 });
	});

	it('hides started when runs finished before the counter existed', () => {
		expect(runs(undefined, 2)).toEqual({ started: null, finished: 2 });
		expect(runs(1, 4)).toEqual({ started: null, finished: 4 });
	});
});

describe('groupStats', () => {
	const progress = new Map([
		[
			'a',
			{
				openedAt: at(100),
				readAt: at(150),
				openCount: 4,
				seriesStarted: 3,
				challengeBest: 9,
				challengeStarted: 1
			}
		],
		['b', { openedAt: at(50), acquiredAt: at(60), openCount: 1 }],
		['c', { openedAt: at(70), failedAt: at(80), assessmentStarted: 1 }],
		['other', { openedAt: at(9999), openCount: 50 }]
	]);
	const attempts = [
		attempt('a', 'series', 8, 10, 200),
		attempt('a', 'series', 6, 10, 300),
		attempt('a', 'timed', 9, 12, 250),
		attempt('c', 'assessment', 3, 10, 400),
		attempt('other', 'series', 1, 1, 5000)
	];

	it('counts sheets read, acquired and failed (acquired counts as read)', () => {
		const stats = groupStats(['a', 'b', 'c', 'd'], progress, attempts);
		expect(stats.sheets).toBe(4);
		expect(stats.read).toBe(2);
		expect(stats.acquired).toBe(1);
		expect(stats.failed).toBe(1);
	});

	it('sums opens and runs per mode, only for the given sheets', () => {
		const stats = groupStats(['a', 'b', 'c', 'd'], progress, attempts);
		expect(stats.opens).toBe(5);
		expect(stats.series).toEqual({ started: 3, finished: 2 });
		expect(stats.challenges).toEqual({ started: 1, finished: 1 });
		expect(stats.assessments).toEqual({ started: 1, finished: 1 });
	});

	it('averages the series scores in percent and keeps the best challenge', () => {
		const stats = groupStats(['a', 'b', 'c'], progress, attempts);
		expect(stats.seriesAverage).toBe(70);
		expect(stats.challengeBest).toBe(9);
		expect(groupStats(['b'], progress, attempts).seriesAverage).toBeNull();
		expect(groupStats(['b'], progress, attempts).challengeBest).toBeNull();
	});

	it('dates the last activity from opens, reads and finished runs', () => {
		expect(groupStats(['a', 'b', 'c'], progress, attempts).lastActivity).toBe(400);
		expect(groupStats(['b'], progress, attempts).lastActivity).toBe(60);
		expect(groupStats(['d'], progress, attempts).lastActivity).toBeNull();
	});

	it('hides started when older finished runs outnumber the counter', () => {
		const old = [attempt('b', 'series', 5, 10, 10), attempt('b', 'series', 5, 10, 20)];
		expect(groupStats(['b'], progress, old).series).toEqual({ started: null, finished: 2 });
	});
});

describe('recentAttempts', () => {
	it('keeps the subject, newest first, pending on top, at most the limit', () => {
		const list = [
			attempt('a', 'series', 1, 2, 100),
			attempt('a', 'timed', 1, 2, 300),
			attempt('x', 'series', 1, 2, 999, 'french'),
			attempt('b', 'assessment', 1, 2, null),
			attempt('c', 'series', 1, 2, 200)
		];
		const recent = recentAttempts(list, 'maths', 3);
		expect(recent.map((a) => a.createdAt?.toMillis() ?? 'pending')).toEqual(['pending', 300, 200]);
	});
});
