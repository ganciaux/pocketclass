import { describe, expect, it } from 'vitest';
import { streak } from './streak.ts';

/** Local noon of a day of November 2026, so the time zone of the machine does not matter. */
const day = (d: number, hour = 12) => new Date(2026, 10, d, hour).getTime();

describe('streak', () => {
	it('counts the days in a row up to today', () => {
		expect(streak([day(24), day(25), day(26, 8), day(26, 20)], day(26))).toEqual({
			days: 3,
			today: true
		});
	});

	it('is still alive when today has nothing yet (ends yesterday)', () => {
		expect(streak([day(24), day(25)], day(26))).toEqual({ days: 2, today: false });
	});

	it('is broken by a missing day, and empty without runs', () => {
		expect(streak([day(22), day(23), day(25)], day(26))).toEqual({ days: 1, today: false });
		expect(streak([day(22)], day(26))).toEqual({ days: 0, today: false });
		expect(streak([], day(26))).toEqual({ days: 0, today: false });
	});

	it('counts across a month change', () => {
		const dec1 = new Date(2026, 11, 1, 9).getTime();
		expect(streak([day(29), day(30), dec1], dec1)).toEqual({ days: 3, today: true });
	});
});
