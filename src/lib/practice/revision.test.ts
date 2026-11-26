import { describe, expect, it } from 'vitest';
import {
	binderRevisions,
	REVISION_COOLDOWN_MS,
	revisionEntryId,
	revisionList,
	revisionOutcome,
	revisionPoints,
	revisionStatus,
	timeLeft
} from './revision.ts';

const at = (ms: number) => ({ toMillis: () => ms });
const DAY = 24 * 60 * 60 * 1000;
const now = 100 * DAY;

describe('revision status', () => {
	it('earns nothing before the sheet is acquired', () => {
		expect(revisionStatus(undefined, now)).toEqual({ kind: 'none' });
		expect(revisionStatus({ revisedAt: at(0) }, now)).toEqual({ kind: 'none' });
	});

	it('is ready when acquired and never revised, or a week (and a margin) after', () => {
		expect(revisionStatus({ acquiredAt: 1 }, now)).toEqual({ kind: 'ready' });
		expect(revisionStatus({ acquiredAt: 1, revisedAt: at(now - 8 * DAY) }, now)).toEqual({
			kind: 'ready'
		});
		const status = revisionStatus(
			{ acquiredAt: 1, revisedAt: at(now - REVISION_COOLDOWN_MS) },
			now
		);
		expect(status.kind).toBe('waiting');
	});

	it('waits a week after a revision, also while its write is pending', () => {
		const waiting = revisionStatus({ acquiredAt: 1, revisedAt: at(now - DAY) }, now);
		expect(waiting.kind === 'waiting' && waiting.readyAt).toBeGreaterThan(now + 5 * DAY);
		const pending = revisionStatus({ acquiredAt: 1, revisedAt: null }, now);
		expect(pending.kind === 'waiting' && pending.readyAt).toBeGreaterThan(now + 6 * DAY);
	});
});

describe('revision outcome', () => {
	const ready = { acquiredAt: 1, revisionCount: 2 };

	it('earns 2 points per key point with a series at 70 % or more', () => {
		expect(revisionPoints(4)).toBe(8);
		expect(revisionOutcome({ correct: 7, total: 10 }, ready, 4, now)).toEqual({
			earned: 8,
			count: 3
		});
		expect(revisionOutcome({ correct: 10, total: 10 }, { acquiredAt: 1 }, 3, now)).toEqual({
			earned: 6,
			count: 1
		});
	});

	it('earns nothing under 70 %, before acquiring or during the week', () => {
		expect(revisionOutcome({ correct: 6, total: 10 }, ready, 4, now)).toBeNull();
		expect(revisionOutcome({ correct: 10, total: 10 }, {}, 4, now)).toBeNull();
		const revised = { ...ready, revisedAt: at(now - DAY) };
		expect(revisionOutcome({ correct: 10, total: 10 }, revised, 4, now)).toBeNull();
	});

	it('names the ledger line after the sheet and the revision number', () => {
		expect(revisionEntryId('maths-fractions', 3)).toBe('revision-maths-fractions-3');
	});
});

describe('hourglass', () => {
	it('rounds the time left up to the minute', () => {
		expect(timeLeft(2 * DAY + 3 * 3600_000 + 61_000)).toEqual({ days: 2, hours: 3, minutes: 2 });
		expect(timeLeft(30_000)).toEqual({ days: 0, hours: 0, minutes: 1 });
		expect(timeLeft(-5)).toEqual({ days: 0, hours: 0, minutes: 0 });
	});

	it('lists acquired sheets, ready first, then the soonest', () => {
		const sheets = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
		const progress = new Map([
			['a', { acquiredAt: 1, revisedAt: at(now - DAY) }],
			['b', {}],
			['c', { acquiredAt: 1, revisedAt: at(now - 3 * DAY) }],
			['d', { acquiredAt: 1 }]
		]);
		expect(revisionList(sheets, progress, now).map((e) => e.sheet.id)).toEqual(['d', 'c', 'a']);
	});
});

describe('binderRevisions', () => {
	it('keeps the sheets of the subjects and chapters the child sees', () => {
		const subject = (id: string, grade: '3e' | '6e') => ({
			id,
			name: id,
			grade,
			order: 0,
			archived: false
		});
		const sheet = (id: string, subjectId: string, chapterId = 'ch') => ({
			id,
			subjectId,
			chapterId,
			archived: false
		});
		const binder = {
			subjects: [subject('maths', '3e'), subject('french', '6e')],
			chapters: [
				{ id: 'ch', archived: false },
				{ id: 'hidden', archived: true }
			],
			sheets: [sheet('a', 'maths'), sheet('b', 'french'), sheet('c', 'maths', 'hidden')],
			progress: ['a', 'b', 'c'].map((id) => ({ id, acquiredAt: 1 }))
		};
		const list = binderRevisions(binder, { grade: '3e', extraSubjects: [] }, now);
		expect(list.map((e) => [e.sheet.id, e.subject.id, e.chapter.id])).toEqual([
			['a', 'maths', 'ch']
		]);
	});
});
