import { describe, expect, it } from 'vitest';
import { percent, practicedSheets } from './scores.ts';

const at = (ms: number) => ({ toMillis: () => ms });

describe('practicedSheets', () => {
	it('keeps practised, known sheets, most recent first, pending on top', () => {
		const sheets = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
		const score = { correct: 1, total: 2 };
		const rows = practicedSheets(sheets, [
			{ id: 'a', practiceLast: score, practiceBest: score, practicedAt: at(100) },
			{ id: 'b', practiceLast: score, practiceBest: score, practicedAt: at(300) },
			{ id: 'c' }, // opened, never practised
			{ id: 'd', practiceLast: score, practiceBest: score, practicedAt: null },
			{ id: 'gone', practiceLast: score, practiceBest: score, practicedAt: at(500) }
		]);
		expect(rows.map((r) => r.sheet.id)).toEqual(['d', 'b', 'a']);
		expect(rows[1].at).toBe(300);
	});

	it('also keeps sheets with a challenge record only, dated by the latest activity', () => {
		const score = { correct: 1, total: 2 };
		const rows = practicedSheets(
			[{ id: 'a' }, { id: 'b' }],
			[
				{ id: 'a', challengeBest: 12, challengedAt: at(200) },
				{
					id: 'b',
					practiceLast: score,
					practiceBest: score,
					practicedAt: at(100),
					challengeBest: 3,
					challengedAt: at(400)
				}
			]
		);
		expect(rows.map((r) => [r.sheet.id, r.record, r.best, r.at])).toEqual([
			['b', 3, score, 400],
			['a', 12, null, 200]
		]);
	});
});

describe('percent', () => {
	it('rounds the success rate', () => {
		expect(percent({ correct: 2, total: 3 })).toBe(67);
		expect(percent({ correct: 0, total: 0 })).toBe(0);
	});
});
