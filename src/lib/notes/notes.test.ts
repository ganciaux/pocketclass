import { describe, expect, it } from 'vitest';
import {
	newestFirst,
	noteContext,
	notePlace,
	openCount,
	reviewActions,
	unresolvedCount
} from './notes.ts';

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

describe('noteContext', () => {
	it('attaches a note to the chapter or the subject of the page', () => {
		expect(noteContext('/chapter/[id]', { id: 'ch1' })).toEqual({ kind: 'chapter', id: 'ch1' });
		expect(noteContext('/subject/[id]', { id: 'maths' })).toEqual({ kind: 'subject', id: 'maths' });
	});

	it('writes a free note from the other child pages', () => {
		for (const route of ['/', '/me', '/me/sheets', '/me/notes']) {
			expect(noteContext(route, {})).toEqual({ kind: 'free' });
		}
	});

	it('hides the button on a sheet (its own form), the parent space and unknown pages', () => {
		expect(noteContext('/concept/[id]', { id: 'c1' })).toBeNull();
		expect(noteContext('/parent/notes', {})).toBeNull();
		expect(noteContext('/parent/chapters/[id]', { id: 'ch1' })).toBeNull();
		expect(noteContext(null, {})).toBeNull();
		expect(noteContext('/chapter/[id]', {})).toBeNull();
	});
});

describe('notePlace', () => {
	const catalog = {
		sheets: new Map([['c1', 'Additionner des fractions']]),
		chapters: new Map([['ch1', 'Fractions']]),
		subjects: new Map([['maths', 'Mathématiques']])
	};

	it('is the most precise place: sheet, then chapter, then subject', () => {
		expect(notePlace({ conceptId: 'c1', chapterId: 'ch1', subjectId: 'maths' }, catalog)).toEqual({
			kind: 'sheet',
			id: 'c1',
			title: 'Additionner des fractions'
		});
		expect(notePlace({ conceptId: null, chapterId: 'ch1', subjectId: null }, catalog)).toEqual({
			kind: 'chapter',
			id: 'ch1',
			title: 'Fractions'
		});
		expect(notePlace({ conceptId: null, chapterId: null, subjectId: 'maths' }, catalog)).toEqual({
			kind: 'subject',
			id: 'maths',
			title: 'Mathématiques'
		});
	});

	it('keeps older notes (no subjectId) on their sheet', () => {
		expect(notePlace({ conceptId: 'c1', chapterId: 'ch1' }, catalog).kind).toBe('sheet');
	});

	it('is free without any target', () => {
		expect(notePlace({ conceptId: null, chapterId: null, subjectId: null }, catalog)).toEqual({
			kind: 'free'
		});
	});

	it('says what is gone (deleted or hidden) instead of falling back to a wider place', () => {
		expect(notePlace({ conceptId: 'old', chapterId: 'ch1', subjectId: 'maths' }, catalog)).toEqual({
			kind: 'gone',
			of: 'sheet'
		});
		expect(notePlace({ conceptId: null, chapterId: 'old', subjectId: null }, catalog)).toEqual({
			kind: 'gone',
			of: 'chapter'
		});
		expect(notePlace({ conceptId: null, chapterId: null, subjectId: 'old' }, catalog)).toEqual({
			kind: 'gone',
			of: 'subject'
		});
	});
});

describe('unresolvedCount', () => {
	it('counts the notes not seen yet and the ones seen but not settled', () => {
		const note = (status: 'open' | 'seen' | 'resolved') => ({ status, createdAt: null });
		const notes = [note('open'), note('seen'), note('seen'), note('resolved'), note('open')];
		expect(unresolvedCount(notes)).toEqual({ open: 2, seen: 2, total: 4 });
		expect(unresolvedCount([])).toEqual({ open: 0, seen: 0, total: 0 });
	});
});
