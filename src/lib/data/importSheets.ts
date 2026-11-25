import {
	doc,
	getDoc,
	getDocs,
	query,
	serverTimestamp,
	where,
	writeBatch
} from 'firebase/firestore';
import { db } from '#lib/firebase.ts';
import { freeColor, nextOrder } from '#lib/binder/binder.ts';
import { MAX_BATCH_OPS } from './batches.ts';
import {
	assessmentRef,
	chaptersCol,
	conceptRef,
	conceptsCol,
	exercisesCol,
	familyDoc,
	subjectsCol
} from './refs.ts';
import type { ChapterImport } from '#lib/schemas/chapter.ts';
import type { SheetDoc } from '#lib/schemas/sheet.ts';
import { subjectsOf, type BackupImport } from '#lib/schemas/subject.ts';
import type { SubjectColor } from './types.ts';
import {
	chunk,
	findSheetConflicts,
	planChapter,
	planSheets,
	planSubject,
	addStats,
	type ExistingSheets,
	type ImportPlan,
	type SheetConflict,
	type WriteOp
} from '#lib/import/sheetPlan.ts';

// Executor of the pure import plans (import/sheetPlan.ts). Import is an online, parent-only
// action: reads here deliberately go to the server (getDoc / getDocs, not cache-first) so the
// plan is computed on up-to-date data.

export class ImportConflictError extends Error {
	constructor(readonly conflicts: SheetConflict[]) {
		super(`Sheet ids already used by other chapters: ${conflicts.map((c) => c.sheetId)}`);
	}
}

/** What exists for these sheet ids (also used by the import preview: new or update, conflicts). */
export async function readExistingSheets(
	familyId: string,
	sheetIds: string[]
): Promise<ExistingSheets> {
	const entries = await Promise.all(
		sheetIds.map(async (id) => {
			const sheet = await getDoc(conceptRef(familyId, id));
			const data = sheet.data();
			if (!data) return null;
			const [exercises, assessment] = await Promise.all([
				getDocs(exercisesCol(familyId, id)),
				getDoc(assessmentRef(familyId, id))
			]);
			const existing = {
				chapterId: data.chapterId,
				order: data.order,
				version: data.version,
				archived: data.archived,
				exerciseIds: exercises.docs.filter((d) => !d.data().archived).map((d) => d.id),
				// The parent's settings survive a new import.
				assessmentSettings: {
					passRate: assessment.data()?.passRate,
					points: assessment.data()?.points
				}
			};
			return [id, existing] as const;
		})
	);
	return Object.fromEntries(entries.filter((entry) => entry !== null));
}

async function run(familyId: string, ops: WriteOp[]): Promise<void> {
	for (const part of chunk(ops, MAX_BATCH_OPS)) {
		const batch = writeBatch(db);
		for (const op of part) {
			const ref = familyDoc(familyId, ...op.path);
			if (op.kind === 'archive') batch.update(ref, { archived: true });
			else batch.set(ref, op.touch ? { ...op.data, updatedAt: serverTimestamp() } : op.data);
		}
		await batch.commit();
	}
}

async function checkConflicts(familyId: string, sheets: SheetDoc[], chapterId: string) {
	const existing = await readExistingSheets(
		familyId,
		sheets.map((s) => s.id)
	);
	const conflicts = findSheetConflicts(sheets, chapterId, existing);
	if (conflicts.length > 0) throw new ImportConflictError(conflicts);
	return existing;
}

/**
 * Adds (or updates) sheets in an existing chapter. Throws `ImportConflictError` if a sheet id
 * belongs to another chapter. Above 450 operations the batches are not atomic: a failure
 * leaves a partial import that a re-import repairs.
 */
export async function importSheets(
	familyId: string,
	chapter: { id: string; subjectId: string },
	sheets: SheetDoc[]
): Promise<ImportPlan> {
	const existing = await checkConflicts(familyId, sheets, chapter.id);
	const inChapter = await getDocs(
		query(conceptsCol(familyId), where('chapterId', '==', chapter.id))
	);
	const plan = planSheets(
		sheets,
		{
			subjectId: chapter.subjectId,
			chapterId: chapter.id,
			nextOrder: nextOrder(inChapter.docs.map((d) => d.data()))
		},
		existing
	);
	await run(familyId, plan.ops);
	return plan;
}

/** Creates a chapter at the end of the subject, with its sheets. Returns the new chapter id. */
export async function importChapter(
	familyId: string,
	subjectId: string,
	chapter: ChapterImport
): Promise<{ chapterId: string; plan: ImportPlan }> {
	const chapterId = doc(chaptersCol(familyId)).id;
	const existing = await checkConflicts(familyId, chapter.sheets, chapterId);
	const chapters = await getDocs(query(chaptersCol(familyId), where('subjectId', '==', subjectId)));
	const order = nextOrder(chapters.docs.map((d) => d.data()));
	const plan = planChapter(chapter, { subjectId, chapterId, order }, existing);
	await run(familyId, plan.ops);
	return { chapterId, plan };
}

/**
 * Restores a backup (`subject@1` or `binder@1`) as NEW subjects, each at the end of its grade,
 * with their chapters and sheets. Throws `ImportConflictError` if a sheet id is already used by
 * an active sheet (sheet ids are family-wide: delete or hide those sheets first).
 */
export async function importBackup(
	familyId: string,
	backup: BackupImport
): Promise<{ subjectIds: string[]; plan: ImportPlan }> {
	const subjects = subjectsOf(backup);
	const sheets = subjects.flatMap((s) => s.chapters.flatMap((c) => c.sheets));
	// No target chapter exists yet: any active sheet with one of these ids is a conflict.
	const existing = await checkConflicts(familyId, sheets, '');
	const known = (await getDocs(subjectsCol(familyId))).docs.map((d) => d.data());

	const ops: WriteOp[] = [];
	const stats = { created: 0, updated: 0, exercises: 0, archivedExercises: 0 };
	const subjectIds: string[] = [];
	for (const subject of subjects) {
		const subjectId = doc(subjectsCol(familyId)).id;
		const color: SubjectColor = subject.color ?? freeColor(known);
		const order = nextOrder(known.filter((s) => s.grade === subject.grade));
		const plan = planSubject(
			subject,
			{
				subjectId,
				order,
				color,
				chapterIds: subject.chapters.map(() => doc(chaptersCol(familyId)).id)
			},
			existing
		);
		ops.push(...plan.ops);
		addStats(stats, plan.stats);
		known.push({ name: subject.name, grade: subject.grade, color, order, archived: false });
		subjectIds.push(subjectId);
	}
	await run(familyId, ops);
	return { subjectIds, plan: { ops, stats } };
}
