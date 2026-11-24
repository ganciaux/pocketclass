import { query, where } from 'firebase/firestore';
import { byOrder, sortSubjects } from '#lib/binder/binder.ts';
import { combine, constant, docSource, querySource } from './sources.ts';
import { watchProgress } from './progress.ts';
import type { ProgressRecord, WithId } from './types.ts';
import {
	chapterRef,
	chaptersCol,
	conceptRef,
	conceptsCol,
	subjectRef,
	subjectsCol
} from './refs.ts';

// Live sources of the family catalogue (the binder), consumed by pages through `live()`.
// Lists include archived items (parent pages show them); child pages filter them out.
// Filtering and sorting are client-side (no composite index needed).

const active = <T extends { archived: boolean }>(doc: T) => (doc.archived ? null : doc);
const any = <T>(doc: T) => doc;

/** Every subject of the family, by grade then order. */
export const watchSubjects = (familyId: string) =>
	querySource(subjectsCol(familyId), (subjects) => sortSubjects(subjects));

/** `withArchived`: parent pages also open archived items (to restore them). */
export const watchSubject = (familyId: string, subjectId: string, withArchived = false) =>
	docSource(subjectRef(familyId, subjectId), withArchived ? any : active);

/** Every chapter of the family (home: what the child can reach in each subject). */
export const watchChapters = (familyId: string) =>
	querySource(chaptersCol(familyId), (chapters) => byOrder(chapters, (c) => c.title));

export const watchChaptersOf = (familyId: string, subjectId: string) =>
	querySource(query(chaptersCol(familyId), where('subjectId', '==', subjectId)), (chapters) =>
		byOrder(chapters, (c) => c.title)
	);

export const watchChapter = (familyId: string, chapterId: string, withArchived = false) =>
	docSource(chapterRef(familyId, chapterId), withArchived ? any : active);

/** Sheets of a chapter, in order (archived included). */
export const watchSheetsOf = (familyId: string, chapterId: string) =>
	querySource(query(conceptsCol(familyId), where('chapterId', '==', chapterId)), (sheets) =>
		byOrder(sheets, (s) => s.title)
	);

/** Sheets of a subject (archived included): progress of each chapter. */
export const watchSheetsOfSubject = (familyId: string, subjectId: string) =>
	querySource(query(conceptsCol(familyId), where('subjectId', '==', subjectId)));

export const watchConcept = (familyId: string, conceptId: string) =>
	docSource(conceptRef(familyId, conceptId), active);

/** Every active sheet of the family (home and dashboards: progress of every subject). */
export const watchActiveConcepts = (familyId: string) =>
	querySource(query(conceptsCol(familyId), where('archived', '==', false)));

/** A child's progress, or nothing to show (parent browsing the binder). */
const progressOf = (familyId: string, profileId: string | null) =>
	profileId ? watchProgress(familyId, profileId) : constant<WithId<ProgressRecord>[]>([]);

/** Home: every subject, chapter and active sheet, with the child's progress. */
export const watchBinder = (familyId: string, profileId: string | null) =>
	combine({
		subjects: watchSubjects(familyId),
		chapters: watchChapters(familyId),
		sheets: watchActiveConcepts(familyId),
		progress: progressOf(familyId, profileId)
	});

/** Subject page: its chapters and sheets, with the child's progress. */
export const watchSubjectContent = (
	familyId: string,
	subjectId: string,
	profileId: string | null
) =>
	combine({
		chapters: watchChaptersOf(familyId, subjectId),
		sheets: watchSheetsOfSubject(familyId, subjectId),
		progress: progressOf(familyId, profileId)
	});

/** Chapter page: its sheets, with the child's progress. */
export const watchChapterContent = (
	familyId: string,
	chapterId: string,
	profileId: string | null
) =>
	combine({
		sheets: watchSheetsOf(familyId, chapterId),
		progress: progressOf(familyId, profileId)
	});
