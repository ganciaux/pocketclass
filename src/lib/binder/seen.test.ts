import { describe, expect, it } from 'vitest';
import type { Grade } from '#lib/data/types.ts';
import { filterSeen, normalize, pickRandom, seenSheets } from './seen.ts';

const at = (ms: number) => ({ toMillis: () => ms });

const subject = (id: string, name: string, grade: Grade) => ({
	id,
	name,
	grade,
	order: 0,
	archived: false
});
const chapter = (id: string, subjectId: string, title: string, archived = false) => ({
	id,
	subjectId,
	title,
	archived
});
const sheet = (id: string, chapterId: string, subjectId: string, title: string) => ({
	id,
	chapterId,
	subjectId,
	title,
	archived: false,
	updatedAt: at(1)
});
const opened = (id: string, openedAt: number | null, read = false) => ({
	id,
	openedAt: openedAt === null ? null : at(openedAt),
	...(read ? { readAt: at(openedAt ?? 0) } : {})
});

const binder = {
	subjects: [
		subject('maths', 'Maths', '3e'),
		subject('fr', 'Français', '3e'),
		subject('maths-5e', 'Maths', '5e')
	],
	chapters: [
		chapter('fractions', 'maths', 'Fractions'),
		chapter('equations', 'maths', 'Équations'),
		chapter('grammar', 'fr', 'Grammaire'),
		chapter('old', 'maths', 'Ancien', true),
		chapter('basics', 'maths-5e', 'Bases')
	],
	sheets: [
		sheet('add', 'fractions', 'maths', 'Additionner des fractions'),
		sheet('half', 'fractions', 'maths', 'Calculer $\\frac{1}{2}$ de 10'),
		sheet('eq1', 'equations', 'maths', 'Équations du 1er degré'),
		sheet('cod', 'grammar', 'fr', "Le complément d'objet"),
		sheet('unopened', 'grammar', 'fr', 'Les adverbes'),
		sheet('archived-chapter', 'old', 'maths', 'Vieille fiche'),
		sheet('other-grade', 'basics', 'maths-5e', 'Les nombres')
	],
	progress: [
		opened('add', 100, true),
		opened('half', 300),
		opened('eq1', null),
		opened('cod', 200),
		opened('archived-chapter', 400),
		opened('other-grade', 500)
	]
};
const view = { grade: '3e' as const, extraSubjects: [] };

describe('seenSheets', () => {
	it('keeps only opened sheets of visible subjects and active chapters', () => {
		const ids = seenSheets(binder, view).map((e) => e.sheet.id);
		expect(ids.sort()).toEqual(['add', 'cod', 'eq1', 'half']);
	});

	it('includes extra subjects of another grade', () => {
		const ids = seenSheets(binder, { grade: '3e', extraSubjects: ['maths-5e'] }).map(
			(e) => e.sheet.id
		);
		expect(ids).toContain('other-grade');
	});

	it('sorts by last opening, pending first', () => {
		expect(seenSheets(binder, view).map((e) => e.sheet.id)).toEqual(['eq1', 'half', 'cod', 'add']);
	});

	it('carries the subject, the chapter and the sheet state', () => {
		const add = seenSheets(binder, view).find((e) => e.sheet.id === 'add');
		expect(add?.subject.name).toBe('Maths');
		expect(add?.chapter.title).toBe('Fractions');
		expect(add?.state).toBe('read');
	});
});

describe('normalize', () => {
	it('lower-cases, strips accents and extra spaces', () => {
		expect(normalize('  Équation   du 1er DEGRÉ ')).toBe('equation du 1er degre');
	});
});

describe('filterSeen', () => {
	const entries = seenSheets(binder, view);
	const ids = (query: string, subjectId: string | null = null) =>
		filterSeen(entries, query, subjectId).map((e) => e.sheet.id);

	it('every word must match the sheet, subject or chapter', () => {
		expect(ids('additionner maths')).toEqual(['add']);
		expect(ids('fraction')).toEqual(['half', 'add']);
		expect(ids('fraction histoire')).toEqual([]);
	});

	it('ignores accents and case', () => {
		expect(ids('EQUATION')).toEqual(['eq1']);
		expect(ids('francais')).toEqual(['cod']);
	});

	it('empty query keeps everything', () => {
		expect(ids('   ')).toEqual(['eq1', 'half', 'cod', 'add']);
	});

	it('filters by subject', () => {
		expect(ids('', 'fr')).toEqual(['cod']);
		expect(ids('fraction', 'fr')).toEqual([]);
	});

	it('searches raw titles with LaTeX', () => {
		expect(ids('frac{1}{2}')).toEqual(['half']);
	});
});

describe('pickRandom', () => {
	it('returns null for an empty list', () => {
		expect(pickRandom([])).toBeNull();
	});

	it('maps the random number onto the list', () => {
		expect(pickRandom(['a', 'b', 'c'], () => 0.99)).toBe('c');
		expect(pickRandom(['a', 'b', 'c'], () => 0)).toBe('a');
	});
});
