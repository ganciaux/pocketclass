import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter, Subject, WithId } from '#lib/data/types.ts';
import { chapterSchema, type ChapterImport } from '#lib/schemas/chapter.ts';
import { validate } from '#lib/schemas/errors.ts';
import {
	backupSchema,
	binderSchema,
	subjectSchema,
	subjectsOf,
	type BackupImport
} from '#lib/schemas/subject.ts';
import {
	binderExport,
	chapterExport,
	exportFileName,
	familyExport,
	plainData,
	subjectDoc,
	subjectExport,
	type StoredSheet
} from './catalogExport.ts';
import { DEFAULT_ASSESSMENT, planChapter, planSubject, type WriteOp } from './sheetPlan.ts';

const sample = chapterSchema.parse(
	JSON.parse(readFileSync('static/samples/maths-3e-revisions.json', 'utf8'))
) as ChapterImport;

/** The documents an import plan writes, by path (what Firestore would hold). */
const written = (ops: WriteOp[]) =>
	new Map(
		ops.flatMap((op) =>
			op.kind === 'set' ? [[op.path.join('/'), op.data as Record<string, unknown>]] : []
		)
	);

/** Sheets read back from the written documents, as the export reads them. */
function storedSheets(docs: Map<string, Record<string, unknown>>, sheetIds: string[]) {
	return sheetIds.map(
		(id): StoredSheet =>
			({
				concept: { id, ...docs.get(`concepts/${id}`) },
				exercises: [...docs]
					.filter(([path]) => path.startsWith(`concepts/${id}/exercises/`))
					.map(([path, data]) => ({ id: path.split('/').at(-1), ...data })),
				assessment: docs.get(`assessments/${id}`) ?? null
			}) as unknown as StoredSheet
	);
}

const ids = sample.sheets.map((s) => s.id);
const withAssessment = (chapter: ChapterImport) =>
	chapter.sheets.map((sheet) => ({ ...sheet, assessment: sheet.assessment ?? DEFAULT_ASSESSMENT }));

describe('export', () => {
	it('a chapter comes back as the JSON it was imported from (every sheet has an assessment)', () => {
		const docs = written(
			planChapter(sample, { subjectId: 's', chapterId: 'ch', order: 0 }, {}).ops
		);
		const exported = chapterExport(
			docs.get('chapters/ch') as unknown as Chapter,
			storedSheets(docs, ids)
		);
		const result = validate(chapterSchema, exported);
		expect(result.success).toBe(true);
		const back = (result as { data: ChapterImport }).data;
		expect(back.title).toBe(sample.title);
		expect(back.group).toBe(sample.group);
		expect(back.sheets).toEqual(withAssessment(sample));
	});

	it('carries the mind map pictures, and leaves the field out when there are none', () => {
		const docs = written(
			planChapter(sample, { subjectId: 's', chapterId: 'ch', order: 0 }, {}).ops
		);
		const [first] = storedSheets(docs, [ids[0]]);
		const image = 'data:image/webp;base64,AAAA';
		const exported = chapterExport({ title: 'T', group: null } as Chapter, [
			{ ...first, mapImages: [image] },
			{ ...first, mapImages: [] }
		]);
		expect(exported.sheets[0].mapImages).toEqual([image]);
		expect('mapImages' in exported.sheets[1]).toBe(false);
	});

	it('leaves hidden exercises out and keeps the parent assessment settings', () => {
		const docs = written(
			planChapter(sample, { subjectId: 's', chapterId: 'ch', order: 0 }, {}).ops
		);
		const [first] = storedSheets(docs, [ids[0]]);
		first.exercises[0] = { ...first.exercises[0], archived: true };
		first.assessment = { ...first.assessment!, passRate: 80, points: 12 };
		const [sheet] = chapterExport({ title: 'T', group: null } as Chapter, [first]).sheets;
		expect(sheet.exercises).toHaveLength(first.exercises.length - 1);
		expect(sheet.assessment).toMatchObject({ passRate: 80, points: 12 });
		expect(
			validate(chapterSchema, { format: 'pocketclass/chapter@1', title: 'T', sheets: [sheet] })
				.success
		).toBe(true);
	});

	it('a subject and a binder round-trip through their schemas and the subject plan', () => {
		const docs = written(
			planChapter(sample, { subjectId: 's', chapterId: 'ch', order: 0 }, {}).ops
		);
		const subject = {
			name: 'Mathématiques',
			grade: '3e',
			color: 'blue',
			order: 0,
			archived: false
		} as Subject;
		const chapter = docs.get('chapters/ch') as unknown as WithId<Chapter>;
		const exported = subjectExport(subject, [{ chapter, sheets: storedSheets(docs, ids) }]);
		expect(validate(subjectSchema, exported).success).toBe(true);
		const binder = binderExport([subjectDoc(subject, [{ chapter, sheets: [] }])]);
		expect(validate(binderSchema, binder).success).toBe(true);
		expect(validate(backupSchema, binder).success).toBe(true);

		// Restored as a new subject: same chapters and sheets.
		const restored = subjectsOf(subjectSchema.parse(exported))[0];
		const plan = planSubject(
			restored,
			{ subjectId: 'new', order: 3, color: 'blue', chapterIds: ['c1'] },
			{}
		);
		const again = written(plan.ops);
		expect(again.get('subjects/new')).toMatchObject({
			name: 'Mathématiques',
			grade: '3e',
			order: 3
		});
		expect(again.get('chapters/c1')).toMatchObject({ subjectId: 'new', title: sample.title });
		expect(plan.stats.created).toBe(sample.sheets.length);
	});

	it('gives a type to an assessment that only holds the parent settings (older sheets)', () => {
		const docs = written(
			planChapter(sample, { subjectId: 's', chapterId: 'ch', order: 0 }, {}).ops
		);
		const [first] = storedSheets(docs, [ids[0]]);
		first.assessment = { passRate: 80 } as never;
		const exported = chapterExport({ title: 'T', group: null } as Chapter, [first]);
		expect(exported.sheets[0].assessment).toEqual({ type: 'test', passRate: 80 });
		expect(validate(chapterSchema, exported).success).toBe(true);
	});

	it('a full backup holds the binders and each profile, dates as ISO text, and restores the binders', () => {
		const at = { toDate: () => new Date('2026-11-26T10:00:00Z') };
		expect(plainData({ a: [{ when: at }], n: 1, s: null })).toEqual({
			a: [{ when: '2026-11-26T10:00:00.000Z' }],
			n: 1,
			s: null
		});
		const docs = written(
			planChapter(sample, { subjectId: 's', chapterId: 'ch', order: 0 }, {}).ops
		);
		const subject = { name: 'Maths', grade: '3e', order: 0, archived: false } as Subject;
		const chapter = docs.get('chapters/ch') as unknown as WithId<Chapter>;
		const family = familyExport(
			[subjectDoc(subject, [{ chapter, sheets: storedSheets(docs, ids) }])],
			[
				{
					profile: { id: 'lea', firstName: 'Léa', role: 'child', points: 30 },
					progress: [{ id: ids[0], acquiredAt: at }],
					notes: [],
					attempts: [{ id: 'x', mode: 'series', createdAt: at }],
					pointsLedger: []
				}
			],
			new Date('2026-11-26T12:00:00Z')
		);
		expect(family.profiles[0]).toMatchObject({
			firstName: 'Léa',
			points: 30,
			progress: [{ id: ids[0], acquiredAt: '2026-11-26T10:00:00.000Z' }]
		});
		const result = validate(backupSchema, JSON.parse(JSON.stringify(family)));
		expect(result.success).toBe(true);
		const backup = (result as { data: BackupImport }).data;
		expect(subjectsOf(backup).map((s) => s.chapters[0].sheets.length)).toEqual([ids.length]);
	});

	it('names files readably', () => {
		expect(exportFileName('chapitre', 'Révisions du brevet !')).toBe(
			'pocketclass-chapitre-revisions-du-brevet.json'
		);
		expect(exportFileName('classeurs', '')).toBe('pocketclass-classeurs.json');
	});
});
