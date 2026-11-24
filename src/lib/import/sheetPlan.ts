import { COLLECTIONS } from '#lib/data/collections.ts';
import type { AssessmentRecord, Chapter, ConceptRecord, ExerciseRecord } from '#lib/data/types.ts';
import type { ChapterImport } from '#lib/schemas/chapter.ts';
import type { Exercise } from '#lib/schemas/common.ts';
import type { SheetDoc } from '#lib/schemas/sheet.ts';

/** What already exists in Firestore for one sheet id (read before planning). */
export interface ExistingSheet {
	chapterId: string;
	order: number;
	version: number;
	archived: boolean;
	/** Active exercise ids. */
	exerciseIds: string[];
	/** An active assessment exists (assessment id = sheet id). */
	hasAssessment: boolean;
}

/** Existing sheets by id (ids missing from the map are new). */
export type ExistingSheets = Record<string, ExistingSheet>;

/** Where the sheets go. `nextOrder`: order of the first new sheet (end of the chapter). */
export interface SheetTarget {
	subjectId: string;
	chapterId: string;
	nextOrder: number;
}

/** Path of a document relative to families/{familyId}. */
export type DocPath = [string, ...string[]];

export type WriteOp =
	/** `touch`: the executor adds a server `updatedAt` timestamp. */
	| { kind: 'set'; path: DocPath; data: Record<string, unknown>; touch?: true }
	| { kind: 'archive'; path: DocPath };

/** A sheet id already used by an active sheet of another chapter. */
export interface SheetConflict {
	sheetId: string;
	chapterId: string;
}

export interface ImportPlan {
	ops: WriteOp[];
	stats: {
		created: number;
		updated: number;
		exercises: number;
		archivedExercises: number;
	};
}

/** Phase 3 scoring rule, stored with each assessment. */
export const DEFAULT_SCORING = { pointsPerCorrect: 5, perfectBonus: 15 } as const;

export function toExerciseRecord(exercise: Exercise): ExerciseRecord {
	const { id: _id, ...record } = exercise;
	return { ...record, archived: false };
}

/** Counts shown in the import preview. */
export function sheetStats(sheet: SheetDoc) {
	const count = (usage: Exercise['usage']) =>
		sheet.exercises.filter((e) => e.usage === usage).length;
	return {
		keyPoints: sheet.keyPoints.length,
		practice: count('practice'),
		assessment: count('assessment')
	};
}

/**
 * Sheet ids are family-wide: an id owned by an active sheet of ANOTHER chapter would be
 * silently moved here. Archived sheets may be taken over (they come back in this chapter).
 */
export function findSheetConflicts(
	sheets: { id: string }[],
	chapterId: string,
	existing: ExistingSheets
): SheetConflict[] {
	return sheets
		.map((sheet) => ({ sheet, owner: existing[sheet.id] }))
		.filter(({ owner }) => owner && !owner.archived && owner.chapterId !== chapterId)
		.map(({ sheet, owner }) => ({ sheetId: sheet.id, chapterId: owner.chapterId }));
}

/**
 * Upserts `sheets` into a chapter: each sheet with its exercises and assessment. An existing
 * sheet keeps its place in the chapter and gets the next version; new ones go to the end.
 * Exercises (and the assessment) missing from the new JSON are archived, never deleted.
 * Conflicts (`findSheetConflicts`) must be checked by the caller before.
 */
export function planSheets(
	sheets: SheetDoc[],
	target: SheetTarget,
	existing: ExistingSheets
): ImportPlan {
	const ops: WriteOp[] = [];
	const stats = { created: 0, updated: 0, exercises: 0, archivedExercises: 0 };
	let nextOrder = target.nextOrder;

	for (const sheet of sheets) {
		const old = existing[sheet.id];
		const sheetPath: DocPath = [COLLECTIONS.concepts, sheet.id];
		const keepsPlace = old && old.chapterId === target.chapterId;
		if (old) stats.updated++;
		else stats.created++;

		const record: Omit<ConceptRecord, 'updatedAt'> = {
			subjectId: target.subjectId,
			chapterId: target.chapterId,
			title: sheet.title,
			order: keepsPlace ? old.order : nextOrder++,
			tags: sheet.tags,
			prerequisites: sheet.prerequisites,
			keyPoints: sheet.keyPoints,
			sheet: sheet.sheet,
			summaryInstruction: sheet.summaryInstruction,
			version: (old?.version ?? 0) + 1,
			archived: false
		};
		ops.push({ kind: 'set', path: sheetPath, data: { ...record }, touch: true });

		for (const exercise of sheet.exercises) {
			ops.push({
				kind: 'set',
				path: [...sheetPath, COLLECTIONS.exercises, exercise.id],
				data: { ...toExerciseRecord(exercise) }
			});
			stats.exercises++;
		}
		const newExerciseIds = new Set(sheet.exercises.map((e) => e.id));
		for (const oldId of old?.exerciseIds ?? []) {
			if (newExerciseIds.has(oldId)) continue;
			ops.push({ kind: 'archive', path: [...sheetPath, COLLECTIONS.exercises, oldId] });
			stats.archivedExercises++;
		}

		const assessmentPath: DocPath = [COLLECTIONS.assessments, sheet.id];
		if (sheet.assessment) {
			const assessment: AssessmentRecord = {
				...sheet.assessment,
				chapterId: target.chapterId,
				conceptIds: [sheet.id],
				scoring: { ...DEFAULT_SCORING },
				archived: false
			};
			ops.push({ kind: 'set', path: assessmentPath, data: { ...assessment } });
		} else if (old?.hasAssessment) {
			ops.push({ kind: 'archive', path: assessmentPath });
		}
	}
	return { ops, stats };
}

/** A new chapter (`chapterId` chosen by the caller) at `order` in its subject, with its sheets. */
export function planChapter(
	chapter: ChapterImport,
	target: { subjectId: string; chapterId: string; order: number },
	existing: ExistingSheets
): ImportPlan {
	const record: Chapter = {
		subjectId: target.subjectId,
		title: chapter.title,
		group: chapter.group ?? null,
		order: target.order,
		archived: false
	};
	const sheets = planSheets(chapter.sheets, { ...target, nextOrder: 0 }, existing);
	return {
		ops: [
			{ kind: 'set', path: [COLLECTIONS.chapters, target.chapterId], data: { ...record } },
			...sheets.ops
		],
		stats: sheets.stats
	};
}

/** Splits operations into chunks that fit in one Firestore batch. */
export function chunk<T>(items: T[], size: number): T[][] {
	const chunks: T[][] = [];
	for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
	return chunks;
}
