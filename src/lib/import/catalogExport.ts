import type {
	AssessmentRecord,
	Chapter,
	ConceptRecord,
	ExerciseRecord,
	Subject,
	WithId
} from '#lib/data/types.ts';
import { CHAPTER_FORMAT, type ChapterDoc } from '#lib/schemas/chapter.ts';
import type { Exercise } from '#lib/schemas/common.ts';
import { SHEET_FORMAT, type AssessmentDoc, type SheetDoc } from '#lib/schemas/sheet.ts';
import {
	BINDER_FORMAT,
	FAMILY_FORMAT,
	SUBJECT_FORMAT,
	type SubjectDoc
} from '#lib/schemas/subject.ts';
import { DEFAULT_ASSESSMENT } from './sheetPlan.ts';

/**
 * Export of the catalogue as the JSON formats the app imports: a sheet (`sheet@1`), a chapter
 * (`chapter@1`), a subject (`subject@1`) or several (`binder@1`). Hidden (archived) items are
 * left out. Pure module (unit-tested by an import → export round trip).
 */

/** A sheet as read from Firestore. */
export interface StoredSheet {
	concept: WithId<ConceptRecord>;
	exercises: WithId<ExerciseRecord>[];
	assessment: AssessmentRecord | null;
	/** Mind map pictures (data URLs, in order); absent or empty: none. */
	mapImages?: string[];
}

/** Only the fields that have a value (Firestore documents may hold none for optional ones). */
const compact = <T extends object>(value: T): T =>
	Object.fromEntries(Object.entries(value).filter(([, field]) => field !== undefined)) as T;

function assessmentDoc(assessment: AssessmentRecord): AssessmentDoc {
	const { type, draw, exerciseIds, paper, passRate, points } = assessment;
	// A sheet imported before assessments may only hold the parent's settings: the default type.
	return compact({
		type: type ?? DEFAULT_ASSESSMENT.type,
		draw,
		exerciseIds,
		paper,
		passRate,
		points
	});
}

export function sheetDoc({ concept, exercises, assessment, mapImages }: StoredSheet): SheetDoc {
	return compact({
		id: concept.id,
		title: concept.title,
		tags: concept.tags ?? [],
		prerequisites: concept.prerequisites,
		keyPoints: concept.keyPoints,
		mindMap: concept.mindMap,
		flashcards: concept.flashcards,
		mapImages: mapImages?.length ? mapImages : undefined,
		sheet: concept.sheet,
		summaryInstruction: concept.summaryInstruction,
		// Stored flat: `{ id, ...record }` is the JSON exercise again, `archived` aside.
		exercises: exercises
			.filter((e) => !e.archived)
			.map(({ archived: _archived, ...exercise }) => exercise as Exercise),
		assessment: assessment && !assessment.archived ? assessmentDoc(assessment) : undefined
	});
}

export function chapterDoc(chapter: Chapter, sheets: StoredSheet[]): ChapterDoc {
	return compact({
		title: chapter.title,
		group: chapter.group ?? undefined,
		sheets: sheets.map(sheetDoc)
	});
}

export function subjectDoc(
	subject: Subject,
	chapters: { chapter: Chapter; sheets: StoredSheet[] }[]
): SubjectDoc {
	return compact({
		name: subject.name,
		grade: subject.grade,
		color: subject.color,
		icon: subject.icon,
		image: subject.image,
		chapters: chapters.map(({ chapter, sheets }) => chapterDoc(chapter, sheets))
	});
}

export const sheetExport = (sheet: StoredSheet) => ({ format: SHEET_FORMAT, ...sheetDoc(sheet) });

export const chapterExport = (chapter: Chapter, sheets: StoredSheet[]) => ({
	format: CHAPTER_FORMAT,
	...chapterDoc(chapter, sheets)
});

export const subjectExport = (...args: Parameters<typeof subjectDoc>) => ({
	format: SUBJECT_FORMAT,
	...subjectDoc(...args)
});

export const binderExport = (subjects: SubjectDoc[]) => ({ format: BINDER_FORMAT, subjects });

/** Firestore values as plain JSON: timestamps (anything with `toDate`) become ISO dates. */
export function plainData(value: unknown): unknown {
	if (value === null || typeof value !== 'object') return value;
	if ('toDate' in value && typeof value.toDate === 'function') {
		return (value.toDate() as Date).toISOString();
	}
	if (Array.isArray(value)) return value.map(plainData);
	return Object.fromEntries(Object.entries(value).map(([key, field]) => [key, plainData(field)]));
}

type Row = { id: string } & Record<string, unknown>;

/** A profile and its sub-collections, as read from Firestore. */
export interface ProfileArchive {
	profile: Row & { firstName: string };
	progress: Row[];
	notes: Row[];
	attempts: Row[];
	pointsLedger: Row[];
}

/** `family@1`: the binders plus every profile's data (dates as ISO text). */
export const familyExport = (subjects: SubjectDoc[], profiles: ProfileArchive[], at: Date) => ({
	format: FAMILY_FORMAT,
	exportedAt: at.toISOString(),
	subjects,
	profiles: profiles.map(({ profile, ...rows }) => ({
		...(plainData(profile) as Row & { firstName: string }),
		...(plainData(rows) as Omit<ProfileArchive, 'profile'>)
	}))
});

/** « pocketclass-chapitre-les-fractions.json »: readable, safe on every system. */
export function exportFileName(kind: string, title: string): string {
	const slug = title
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 60);
	return `pocketclass-${kind}${slug ? `-${slug}` : ''}.json`;
}
