import { describe, expect, it } from 'vitest';
import { newestFirst, openCount, reviewActions } from './notes.ts';

const at = (ms: number) => ({ toMillis: () => ms });

describe('newestFirst', () => {
	it('sorts by creation time, pending notes first', () => {
		const notes = [
			{ id: 'old', status: 'open' as const, createdAt: at(1) },
			{ id: 'pending', status: 'open' as const, createdAt: null },
			{ id: 'new', status: 'seen' as const, createdAt: at(2) }
		];
		expect(newestFirst(notes).map((n) => n.id)).toEqual(['pending', 'new', 'old']);
	});
});

it('openCount counts the notes not seen yet', () => {
	expect(
		openCount([
			{ status: 'open', createdAt: null },
			{ status: 'seen', createdAt: null },
			{ status: 'resolved', createdAt: null }
		])
	).toBe(1);
});

it('reviewActions: open → seen / resolved, seen → resolved, resolved → reopen', () => {
	expect(reviewActions('open')).toEqual(['seen', 'resolved']);
	expect(reviewActions('seen')).toEqual(['resolved']);
	expect(reviewActions('resolved')).toEqual(['open']);
});
