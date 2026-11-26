import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { chapterSchema, type ChapterImport } from '#lib/schemas/chapter.ts';
import type { SheetDoc } from '#lib/schemas/sheet.ts';
import {
	batchesOf,
	chunk,
	findSheetConflicts,
	planChapter,
	planSheets,
	sheetStats,
	type ExistingSheets,
	type WriteOp
} from './sheetPlan.ts';

const sample: ChapterImport = chapterSchema.parse(
	JSON.parse(readFileSync('static/samples/maths-3e-revisions.json', 'utf8'))
);
const [fractions, powers] = sample.sheets;
const target = { subjectId: 'maths-3e', chapterId: 'numbers', nextOrder: 5 };

const key = (op: WriteOp) => `${op.kind} ${op.path.join('/')}`;
const find = (ops: WriteOp[], path: string) => ops.find((op) => op.path.join('/') === path);
const dataOf = (op: WriteOp | undefined) => (op?.kind === 'set' ? op.data : undefined);

/** The state left in Firestore by a previous import of `sheet` into `chapterId`. */
function existingAfter(sheet: SheetDoc, chapterId: string, version = 1, order = 0): ExistingSheets {
	return {
		[sheet.id]: {
			chapterId,
			order,
			version,
			archived: false,
			exerciseIds: sheet.exercises.map((e) => e.id),
			assessmentSettings: {}
		}
	};
}

describe('planSheets', () => {
	it('writes mind map pictures only when the JSON has them, clearing the empty slots', () => {
		const image = 'data:image/webp;base64,AAAA';
		const without = planSheets([fractions], target, {});
		expect(without.ops.some((op) => op.path.includes('mapImages'))).toBe(false);
		const withOne = planSheets([{ ...fractions, mapImages: [image] }], target, {});
		const images = withOne.ops.filter((op) => op.path.includes('mapImages')).map(key);
		expect(images).toEqual([
			'set concepts/maths-3e-fractions/mapImages/image-1',
			'delete concepts/maths-3e-fractions/mapImages/image-2',
			'delete concepts/maths-3e-fractions/mapImages/image-3'
		]);
		expect(dataOf(find(withOne.ops, 'concepts/maths-3e-fractions/mapImages/image-1'))).toEqual({
			dataUrl: image,
			order: 1
		});
	});

	it('creates a new sheet at the end of the chapter, with exercises and assessment', () => {
		const plan = planSheets([fractions, powers], target, {});
		const keys = plan.ops.map(key);

		expect(keys[0]).toBe('set concepts/maths-3e-fractions');
		expect(keys).toContain('set concepts/maths-3e-fractions/exercises/simplify-1');
		expect(keys).toContain('set assessments/maths-3e-fractions');
		expect(plan.ops.some((op) => op.kind === 'archive')).toBe(false);
		expect(new Set(keys).size).toBe(keys.length);
		expect(plan.stats).toEqual({ created: 2, updated: 0, exercises: 37, archivedExercises: 0 });

		expect(dataOf(find(plan.ops, 'concepts/maths-3e-fractions'))).toMatchObject({
			subjectId: 'maths-3e',
			chapterId: 'numbers',
			order: 5,
			version: 1,
			archived: false
		});
		expect(dataOf(find(plan.ops, 'concepts/maths-3e-powers'))).toMatchObject({ order: 6 });
	});

	it('stores the sheet tags', () => {
		const tagged = { ...fractions, tags: ['dénominateur', 'simplifier'] };
		const plan = planSheets([tagged], target, {});
		expect(dataOf(find(plan.ops, 'concepts/maths-3e-fractions'))).toMatchObject({
			tags: ['dénominateur', 'simplifier']
		});
	});

	it('stores the mind map, and none when the JSON has none', () => {
		const mindMap = [{ keyPoint: fractions.keyPoints[0].id, leaves: ['a/b'] }];
		const withMap = planSheets([{ ...fractions, mindMap }], target, {});
		expect(dataOf(find(withMap.ops, 'concepts/maths-3e-fractions'))).toMatchObject({ mindMap });
		const without = planSheets([{ ...fractions, mindMap: undefined }], target, {});
		expect(dataOf(find(without.ops, 'concepts/maths-3e-fractions'))?.mindMap).toBeUndefined();
	});

	it('stores the revision cards, and none when the JSON has none', () => {
		const flashcards = [{ tag: 'rule' as const, front: 'Recto ?', back: 'Verso.' }];
		const withCards = planSheets([{ ...fractions, flashcards }], target, {});
		expect(dataOf(find(withCards.ops, 'concepts/maths-3e-fractions'))).toMatchObject({
			flashcards
		});
		const without = planSheets([{ ...fractions, flashcards: undefined }], target, {});
		expect(dataOf(find(without.ops, 'concepts/maths-3e-fractions'))?.flashcards).toBeUndefined();
	});

	it('stamps the sheet (server updatedAt) but not its exercises', () => {
		const plan = planSheets([fractions], target, {});
		const touched = plan.ops.filter((op) => op.kind === 'set' && op.touch).map(key);
		expect(touched).toEqual(['set concepts/maths-3e-fractions']);
	});

	it('stores exercises flat: `{ id, ...record }` is the JSON exercise again', () => {
		const plan = planSheets([fractions], target, {});
		const record = dataOf(find(plan.ops, 'concepts/maths-3e-fractions/exercises/add-2'));
		expect(record).toMatchObject({ type: 'calculation', keyPoint: 'kp-add', archived: false });
		const { archived: _archived, ...rest } = record ?? {};
		expect({ id: 'add-2', ...rest }).toEqual(fractions.exercises.find((e) => e.id === 'add-2'));

		expect(dataOf(find(plan.ops, 'assessments/maths-3e-fractions'))).toMatchObject({
			chapterId: 'numbers',
			conceptIds: ['maths-3e-fractions'],
			draw: { perKeyPoint: 2 },
			archived: false
		});
	});

	it('gives every sheet an assessment and keeps the parent settings on a new import', () => {
		const v2 = structuredClone(fractions);
		delete v2.assessment;
		const existing = existingAfter(fractions, 'numbers');
		existing[fractions.id].assessmentSettings = { passRate: 80, points: 25 };
		const data = dataOf(
			find(planSheets([v2], target, existing).ops, 'assessments/maths-3e-fractions')
		);
		expect(data).toMatchObject({
			type: 'test',
			draw: { perKeyPoint: 2 },
			passRate: 80,
			points: 25,
			archived: false
		});
	});

	it('updates an existing sheet in place: same order, next version, archives what disappeared', () => {
		const v2 = structuredClone(fractions);
		v2.exercises = v2.exercises.filter((e) => e.id !== 'add-1');
		delete v2.assessment;

		const plan = planSheets([v2], target, existingAfter(fractions, 'numbers', 3, 2));
		const keys = plan.ops.map(key);

		expect(dataOf(find(plan.ops, 'concepts/maths-3e-fractions'))).toMatchObject({
			order: 2,
			version: 4
		});
		expect(keys).toContain('archive concepts/maths-3e-fractions/exercises/add-1');
		expect(keys).not.toContain('set concepts/maths-3e-fractions/exercises/add-1');
		expect(keys).toContain('set assessments/maths-3e-fractions');
		expect(plan.stats).toMatchObject({ created: 0, updated: 1, archivedExercises: 1 });
	});

	it('an archived sheet taken over by another chapter goes to its end', () => {
		const existing = existingAfter(fractions, 'old-chapter', 1, 0);
		existing[fractions.id].archived = true;
		const plan = planSheets([fractions], target, existing);
		expect(dataOf(find(plan.ops, 'concepts/maths-3e-fractions'))).toMatchObject({
			chapterId: 'numbers',
			order: 5,
			version: 2,
			archived: false
		});
	});
});

describe('findSheetConflicts', () => {
	it('reports ids owned by an active sheet of another chapter only', () => {
		const archivedElsewhere = existingAfter(powers, 'geometry');
		archivedElsewhere[powers.id].archived = true;
		expect(
			findSheetConflicts([fractions, powers], 'numbers', {
				...existingAfter(fractions, 'numbers'), // same chapter: an update, fine
				...archivedElsewhere // archived: may be taken over
			})
		).toEqual([]);
		expect(
			findSheetConflicts([fractions], 'numbers', existingAfter(fractions, 'geometry'))
		).toEqual([{ sheetId: 'maths-3e-fractions', chapterId: 'geometry' }]);
	});

	it('names the chapter that owns the sheet when its title is known', () => {
		const owned = existingAfter(fractions, 'geometry');
		owned[fractions.id].chapterTitle = 'Géométrie';
		expect(findSheetConflicts([fractions], 'numbers', owned)).toEqual([
			{ sheetId: 'maths-3e-fractions', chapterId: 'geometry', chapterTitle: 'Géométrie' }
		]);
	});
});

describe('planChapter', () => {
	it('creates the chapter first, then its sheets numbered from 0', () => {
		const plan = planChapter(sample, { subjectId: 'maths-3e', chapterId: 'ch1', order: 4 }, {});
		expect(plan.ops[0]).toEqual({
			kind: 'set',
			path: ['chapters', 'ch1'],
			data: {
				subjectId: 'maths-3e',
				title: 'Révisions du brevet',
				group: 'Nombres et géométrie',
				order: 4,
				archived: false
			}
		});
		const orders = sample.sheets.map((s) => dataOf(find(plan.ops, `concepts/${s.id}`))?.order);
		expect(orders).toEqual([0, 1, 2]);
		expect(plan.stats.created).toBe(3);
	});
});

describe('sheetStats', () => {
	it('counts key points and exercises by usage', () => {
		expect(sheetStats(fractions)).toEqual({ keyPoints: 5, practice: 20, assessment: 10 });
	});
});

describe('chunk', () => {
	it('splits into batches of at most n items', () => {
		const items = Array.from({ length: 1000 }, (_, i) => i);
		const chunks = chunk(items, 450);
		expect(chunks.map((c) => c.length)).toEqual([450, 450, 100]);
		expect(chunks.flat()).toEqual(items);
	});
});

describe('batchesOf', () => {
	const set = (n: number, chars: number): WriteOp => ({
		kind: 'set',
		path: ['x', String(n)],
		data: { blob: 'a'.repeat(chars) }
	});

	it('cuts by number of operations and by size of data', () => {
		const small = Array.from({ length: 5 }, (_, i) => set(i, 10));
		expect(batchesOf(small, 2).map((b) => b.length)).toEqual([2, 2, 1]);
		const big = [
			set(1, 600),
			set(2, 600),
			set(3, 10),
			{ kind: 'delete', path: ['x', '4'] } as WriteOp
		];
		expect(batchesOf(big, 450, 1000).map((b) => b.length)).toEqual([1, 3]);
	});
});
