import { COLLECTIONS } from '#lib/data/collections.ts';
import type {
	AssessmentRecord,
	AssessmentSettingsRecord,
	Chapter,
	Subject,
	ConceptRecord,
	ExerciseRecord
} from '#lib/data/types.ts';
import type { ChapterDoc } from '#lib/schemas/chapter.ts';
import type { Exercise } from '#lib/schemas/common.ts';
import { MAX_MAP_IMAGES, type SheetDoc } from '#lib/schemas/sheet.ts';
import type { SubjectDoc } from '#lib/schemas/subject.ts';

/** What already exists in Firestore for one sheet id (read before planning). */
export interface ExistingSheet {
	chapterId: string;
	/** Title of its chapter (named in a conflict message). */
	chapterTitle?: string;
	order: number;
	version: number;
	archived: boolean;
	/** Active exercise ids. */
	exerciseIds: string[];
	/** The parent's assessment settings (assessment id = sheet id), kept by a new import. */
	assessmentSettings: AssessmentSettingsRecord;
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
	| { kind: 'archive'; path: DocPath }
	| { kind: 'delete'; path: DocPath };

/** A sheet id already used by an active sheet of another chapter. */
export interface SheetConflict {
	sheetId: string;
	chapterId: string;
	chapterTitle?: string;
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

/**
 * Write operations cut into batches of at most `maxOps` operations and about `maxChars`
 * characters of data (mind map pictures are large; a Firestore request is limited to 10 MiB).
 */
export function batchesOf(ops: WriteOp[], maxOps: number, maxChars = 4_000_000): WriteOp[][] {
	const batches: WriteOp[][] = [];
	let current: WriteOp[] = [];
	let chars = 0;
	for (const op of ops) {
		const size = op.kind === 'set' ? JSON.stringify(op.data).length : 100;
		if (current.length > 0 && (current.length >= maxOps || chars + size > maxChars)) {
			batches.push(current);
			current = [];
			chars = 0;
		}
		current.push(op);
		chars += size;
	}
	if (current.length > 0) batches.push(current);
	return batches;
}

/** Mind map picture ids (`data/mapImages.ts` uses the same slots). */
export const MAP_IMAGE_SLOTS = Array.from({ length: MAX_MAP_IMAGES }, (_, i) => `image-${i + 1}`);

/** The assessment of a sheet whose JSON has none. */
export const DEFAULT_ASSESSMENT = { type: 'test', draw: { perKeyPoint: 2 } } as const;

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
		.map(({ sheet, owner }) => ({
			sheetId: sheet.id,
			chapterId: owner.chapterId,
			chapterTitle: owner.chapterTitle
		}));
}

/**
 * Upserts `sheets` into a chapter: each sheet with its exercises and assessment. An existing
 * sheet keeps its place in the chapter and gets the next version; new ones go to the end.
 * Exercises missing from the new JSON are archived, never deleted; the assessment is rewritten
 * (keeping the parent's settings).
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
			mindMap: sheet.mindMap,
			flashcards: sheet.flashcards,
			figures: sheet.figures,
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

		// Mind map pictures come only from a backup: a JSON without them keeps those in place.
		if (sheet.mapImages) {
			MAP_IMAGE_SLOTS.forEach((id, i) => {
				const path: DocPath = [...sheetPath, COLLECTIONS.mapImages, id];
				const dataUrl = sheet.mapImages?.[i];
				ops.push(
					dataUrl
						? { kind: 'set', path, data: { dataUrl, order: i + 1 } }
						: { kind: 'delete', path }
				);
			});
		}

		// Every sheet has an assessment (its questions may all be generated).
		const assessment: AssessmentRecord = {
			...(sheet.assessment ?? DEFAULT_ASSESSMENT),
			// The parent's settings already in the family win (a value they never set is undefined).
			...definedOnly(old?.assessmentSettings),
			chapterId: target.chapterId,
			conceptIds: [sheet.id],
			archived: false
		};
		ops.push({
			kind: 'set',
			path: [COLLECTIONS.assessments, sheet.id],
			data: { ...assessment }
		});
	}
	return { ops, stats };
}

/** A new chapter (`chapterId` chosen by the caller) at `order` in its subject, with its sheets. */
export function planChapter(
	chapter: ChapterDoc,
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

/** The fields that have a value (an `undefined` must not overwrite one when spread). */
function definedOnly<T extends object>(value: T | undefined): Partial<T> {
	return Object.fromEntries(
		Object.entries(value ?? {}).filter(([, field]) => field !== undefined)
	) as Partial<T>;
}

/**
 * A new subject (backup restore) with its chapters and sheets. Ids are chosen by the caller:
 * `chapterIds[i]` for `subject.chapters[i]`; chapters keep the document's order.
 */
export function planSubject(
	subject: SubjectDoc,
	target: { subjectId: string; order: number; color: Subject['color']; chapterIds: string[] },
	existing: ExistingSheets
): ImportPlan {
	const record: Subject = {
		name: subject.name,
		grade: subject.grade,
		color: target.color,
		order: target.order,
		archived: false,
		...(subject.icon ? { icon: subject.icon } : {}),
		...(subject.image ? { image: subject.image } : {})
	};
	const ops: WriteOp[] = [
		{ kind: 'set', path: [COLLECTIONS.subjects, target.subjectId], data: { ...record } }
	];
	const stats = { created: 0, updated: 0, exercises: 0, archivedExercises: 0 };
	subject.chapters.forEach((chapter, order) => {
		const plan = planChapter(
			chapter,
			{ subjectId: target.subjectId, chapterId: target.chapterIds[order], order },
			existing
		);
		ops.push(...plan.ops);
		addStats(stats, plan.stats);
	});
	return { ops, stats };
}

/** Adds the counts of one plan to a running total. */
export function addStats(total: ImportPlan['stats'], add: ImportPlan['stats']): void {
	for (const key of Object.keys(total) as (keyof ImportPlan['stats'])[]) total[key] += add[key];
}
