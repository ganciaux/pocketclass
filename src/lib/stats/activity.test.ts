import { describe, expect, it } from 'vitest';
import {
	activityDays,
	activityEntries,
	type ActivityAttempt,
	type ActivityLine
} from './activity.ts';

const at = (ms: number) => ({ toMillis: () => ms });
const HOUR = 3600_000;
const DAY = 24 * HOUR;
/** Local noon, so day boundaries do not depend on the test machine's time zone. */
const noon = new Date(2026, 10, 26, 12).getTime();

const attempt = (id: string, extra: Partial<ActivityAttempt>): ActivityAttempt => ({
	id,
	conceptId: 'fractions',
	subjectId: 'maths',
	mode: 'series',
	correct: 8,
	total: 10,
	createdAt: at(noon),
	...extra
});
const line = (id: string, extra: Partial<ActivityLine>): ActivityLine => ({
	id,
	kind: 'revision',
	conceptId: 'fractions',
	subjectId: 'maths',
	amount: 6,
	createdAt: at(noon),
	...extra
});

describe('activityEntries', () => {
	it('puts the points of a batch on its run, newest first', () => {
		const entries = activityEntries(
			[
				attempt('s1', { createdAt: at(noon - HOUR) }),
				attempt('a1', { mode: 'assessment', correct: 9, createdAt: at(noon) }),
				attempt('s2', { createdAt: at(noon - 2 * HOUR) })
			],
			[
				line('assessment-fractions', { kind: 'assessment', amount: 30, createdAt: at(noon) }),
				line('revision-fractions-1', { createdAt: at(noon - HOUR) })
			]
		);
		expect(entries.map((e) => [e.id, e.points, e.passed])).toEqual([
			['a1', 30, true],
			['s1', 6, null],
			['s2', 0, null]
		]);
	});

	it('judges an assessment at the sheet pass rate, pending writes first', () => {
		const entries = activityEntries(
			[
				attempt('a1', { mode: 'assessment', correct: 7 }),
				attempt('a2', { mode: 'assessment', correct: 7, createdAt: null })
			],
			[],
			new Map([['fractions', 80]])
		);
		expect(entries.map((e) => [e.id, e.passed])).toEqual([
			['a2', false],
			['a1', false]
		]);
		expect(entries[0].at).toBe(Number.POSITIVE_INFINITY);
	});

	it('keeps a points line whose run is not in the history', () => {
		const entries = activityEntries([], [line('revision-x-1', { conceptId: 'x' })]);
		expect(entries).toMatchObject([{ id: 'revision-x-1', kind: 'points', points: 6, score: null }]);
	});
});

describe('activityDays', () => {
	const entries = activityEntries(
		[
			attempt('today', {}),
			attempt('pending', { createdAt: null }),
			attempt('yesterday', { createdAt: at(noon - DAY) }),
			attempt('old', { createdAt: at(noon - 40 * DAY) })
		],
		[line('revision-fractions-1', { createdAt: at(noon - DAY) })]
	);

	it('groups the last days, today first, with the points of each day', () => {
		const { days, more } = activityDays(entries, noon, 30);
		expect(days.map((d) => [d.daysAgo, d.entries.map((e) => e.id), d.points])).toEqual([
			[0, ['pending', 'today'], 0],
			[1, ['yesterday'], 6]
		]);
		expect(more).toBe(true);
	});

	it('shows older days when the window grows', () => {
		const { days, more } = activityDays(entries, noon, 60);
		expect(days.map((d) => d.daysAgo)).toEqual([0, 1, 40]);
		expect(more).toBe(false);
	});
});
