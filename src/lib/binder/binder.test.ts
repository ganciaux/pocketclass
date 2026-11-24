import { describe, expect, it } from 'vitest';
import {
	freeColor,
	groupChapters,
	isAcquired,
	groupNames,
	moveItem,
	nextOrder,
	nextUnread,
	reachableSheets,
	sheetState,
	tally,
	tallyBy,
	visibleSubjects,
	type SheetProgress
} from './binder.ts';
import type { Grade } from '#lib/data/types.ts';

const at = (ms: number) => ({ toMillis: () => ms });

function subject(id: string, grade: Grade, order: number, archived = false) {
	return { id, name: id, grade, order, archived };
}

describe('visibleSubjects', () => {
	const subjects = [
		subject('french-3e', '3e', 1),
		subject('maths-3e', '3e', 0),
		subject('maths-6e', '6e', 0),
		subject('old-3e', '3e', 2, true),
		subject('english-4e', '4e', 0)
	];

	it('shows the active subjects of the grade, in order', () => {
		expect(visibleSubjects(subjects, { grade: '3e' }).map((s) => s.id)).toEqual([
			'maths-3e',
			'french-3e'
		]);
	});

	it('adds the extra subjects after those of the grade', () => {
		const ids = visibleSubjects(subjects, {
			grade: '3e',
			extraSubjects: ['english-4e', 'maths-6e', 'old-3e']
		}).map((s) => s.id);
		expect(ids).toEqual(['maths-3e', 'french-3e', 'maths-6e', 'english-4e']);
	});

	it('shows only the extras when the profile has no grade', () => {
		expect(visibleSubjects(subjects, { grade: null, extraSubjects: ['maths-6e'] })).toHaveLength(1);
	});
});

describe('ordering', () => {
	const items = [
		{ id: 'a', order: 0 },
		{ id: 'b', order: 1 },
		{ id: 'c', order: 2 }
	];

	it('moves an item and returns only the changed orders', () => {
		expect(moveItem(items, 'c', -1)).toEqual([
			{ id: 'c', order: 1 },
			{ id: 'b', order: 2 }
		]);
		expect(moveItem(items, 'a', 1)).toEqual([
			{ id: 'b', order: 0 },
			{ id: 'a', order: 1 }
		]);
	});

	it('does nothing at either end or for an unknown id', () => {
		expect(moveItem(items, 'a', -1)).toEqual([]);
		expect(moveItem(items, 'c', 1)).toEqual([]);
		expect(moveItem(items, 'z', 1)).toEqual([]);
	});

	it('renumbers gaps and duplicates while moving', () => {
		const messy = [
			{ id: 'a', order: 3 },
			{ id: 'b', order: 3 },
			{ id: 'c', order: 9 }
		];
		expect(moveItem(messy, 'c', -1)).toEqual([
			{ id: 'a', order: 0 },
			{ id: 'c', order: 1 },
			{ id: 'b', order: 2 }
		]);
	});

	it('appends after the highest order', () => {
		expect(nextOrder([])).toBe(0);
		expect(nextOrder(items)).toBe(3);
	});
});

describe('chapters', () => {
	const chapter = (title: string, order: number, group: string | null) => ({ title, order, group });

	it('groups chapters under their heading, placed at their first chapter', () => {
		const groups = groupChapters([
			chapter('Pythagore', 2, 'Géométrie'),
			chapter('Fractions', 0, 'Nombres'),
			chapter('Révisions', 3, null),
			chapter('Puissances', 4, ' Nombres '),
			chapter('Thalès', 1, 'Géométrie')
		]);
		expect(groups.map((g) => [g.group, g.chapters.map((c) => c.title)])).toEqual([
			['Nombres', ['Fractions', 'Puissances']],
			['Géométrie', ['Thalès', 'Pythagore']],
			[null, ['Révisions']]
		]);
	});

	it('lists the group names once, for suggestions', () => {
		expect(
			groupNames([chapter('a', 0, 'Nombres'), chapter('b', 1, 'Algèbre'), chapter('c', 2, null)])
		).toEqual(['Algèbre', 'Nombres']);
		expect(groupNames([chapter('a', 0, 'Nombres'), chapter('b', 1, 'Nombres')])).toEqual([
			'Nombres'
		]);
	});
});

describe('sheet states', () => {
	const sheet = { updatedAt: at(100) };

	it('is new until opened', () => {
		expect(sheetState(sheet, undefined)).toBe('new');
	});

	it('is updated when re-imported after the last opening', () => {
		expect(sheetState({ updatedAt: at(200) }, { openedAt: at(150), readAt: at(150) })).toBe(
			'updated'
		);
		expect(sheetState(sheet, { openedAt: at(150) })).toBe('opened');
	});

	it('is read once marked, even while the write is pending', () => {
		expect(sheetState(sheet, { openedAt: at(150), readAt: at(160) })).toBe('read');
		expect(sheetState(sheet, { openedAt: null, readAt: null })).toBe('read');
	});

	it('a pending opening (null) counts as just opened', () => {
		expect(sheetState({ updatedAt: at(999) }, { openedAt: null })).toBe('opened');
		expect(sheetState({ updatedAt: null }, { openedAt: at(1) })).toBe('opened');
	});

	it('is still new when only stamped by the parent (never opened)', () => {
		expect(sheetState(sheet, { acquiredAt: at(50) })).toBe('new');
	});
});

describe('acquired stamp', () => {
	it('is acquired once stamped, even while the write is pending', () => {
		expect(isAcquired(undefined)).toBe(false);
		expect(isAcquired({ openedAt: at(1) })).toBe(false);
		expect(isAcquired({ openedAt: at(1), acquiredAt: at(2) })).toBe(true);
		expect(isAcquired({ acquiredAt: null })).toBe(true);
	});
});

describe('progress counts', () => {
	const sheets = [
		{ id: 's1', subjectId: 'maths', chapterId: 'fractions', updatedAt: at(100), archived: false },
		{ id: 's2', subjectId: 'maths', chapterId: 'fractions', updatedAt: at(300), archived: false },
		{ id: 's3', subjectId: 'maths', chapterId: 'powers', updatedAt: at(100), archived: false },
		{ id: 's4', subjectId: 'french', chapterId: 'verbs', updatedAt: at(100), archived: false }
	];
	const progress = new Map<string, SheetProgress>([
		['s1', { openedAt: at(200), readAt: at(200) }],
		['s2', { openedAt: at(200), readAt: at(200) }],
		['s3', { openedAt: at(200), acquiredAt: at(250) }],
		['s4', { acquiredAt: at(250) }]
	]);

	it('counts read, fresh (new or updated) and acquired sheets', () => {
		expect(tally(sheets, progress)).toEqual({ total: 4, read: 1, fresh: 2, acquired: 2 });
	});

	it('counts per subject and per chapter', () => {
		const bySubject = tallyBy(sheets, 'subjectId', progress);
		expect(bySubject.get('maths')).toEqual({ total: 3, read: 1, fresh: 1, acquired: 1 });
		expect(bySubject.get('french')).toEqual({ total: 1, read: 0, fresh: 1, acquired: 1 });
		expect(tallyBy(sheets, 'chapterId', progress).get('powers')).toEqual({
			total: 1,
			read: 0,
			fresh: 0,
			acquired: 1
		});
	});

	it('only reaches active sheets of active chapters', () => {
		const chapters = [
			{ id: 'fractions', archived: false },
			{ id: 'powers', archived: true }
		];
		const archived = { ...sheets[1], archived: true };
		expect(reachableSheets([sheets[0], archived, sheets[2]], chapters).map((s) => s.id)).toEqual([
			's1'
		]);
	});
});

describe('nextUnread', () => {
	const chapters = [
		{ id: 'b', title: 'B', order: 1 },
		{ id: 'a', title: 'A', order: 0 }
	];
	const sheet = (id: string, chapterId: string, order: number) => ({
		id,
		chapterId,
		order,
		title: id,
		updatedAt: at(1)
	});
	const sheets = [sheet('b1', 'b', 0), sheet('a2', 'a', 1), sheet('a1', 'a', 0)];

	it('follows the chapter order, then the sheet order', () => {
		expect(nextUnread(chapters, sheets, new Map())?.id).toBe('a1');
		const read = { openedAt: at(2), readAt: at(2) };
		expect(nextUnread(chapters, sheets, new Map([['a1', read]]))?.id).toBe('a2');
		expect(
			nextUnread(
				chapters,
				sheets,
				new Map([
					['a1', read],
					['a2', read],
					['b1', read]
				])
			)
		).toBeNull();
	});

	it('skips the sheets stamped as acquired, read or not', () => {
		const acquired = { acquiredAt: at(2) };
		expect(nextUnread(chapters, sheets, new Map([['a1', acquired]]))?.id).toBe('a2');
	});
});

describe('freeColor', () => {
	it('picks the first unused colour, then cycles', () => {
		expect(freeColor([])).toBe('amber');
		expect(freeColor([{ color: 'amber' }, { color: 'emerald' }])).toBe('blue');
	});
});
