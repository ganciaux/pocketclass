import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { chapterSchema, type ChapterImport } from '#lib/schemas/chapter.ts';
import type { SheetDoc } from '#lib/schemas/sheet.ts';
import {
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
			hasAssessment: !!sheet.assessment
		}
	};
}

describe('planSheets', () => {
	it('creates a new sheet at the end of the chapter, with exercises and assessment', () => {
		const plan = planSheets([fractions, powers], target, {});
		const keys = plan.ops.map(key);

		expect(keys[0]).toBe('set concepts/maths-3e-fractions');
		expect(keys).toContain('set concepts/maths-3e-fractions/exercises/simplify-1');
		expect(keys).toContain('set assessments/maths-3e-fractions');
		expect(plan.ops.some((op) => op.kind === 'archive')).toBe(false);
		expect(new Set(keys).size).toBe(keys.length);
		expect(plan.stats).toEqual({ created: 2, updated: 0, exercises: 30, archivedExercises: 0 });

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
			scoring: { pointsPerCorrect: 5, perfectBonus: 15 }
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
		expect(keys).toContain('archive assessments/maths-3e-fractions');
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
		expect(sheetStats(fractions)).toEqual({ keyPoints: 5, practice: 16, assessment: 10 });
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
