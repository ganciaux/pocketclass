import { getDoc, getDocs, query, where, type Query } from 'firebase/firestore';
import { activeOnly, byOrder, sortSubjects } from '#lib/binder/binder.ts';
import {
	binderExport,
	familyExport,
	chapterExport,
	sheetExport,
	subjectDoc,
	subjectExport,
	type StoredSheet
} from '#lib/import/catalogExport.ts';
import {
	assessmentRef,
	attemptsCol,
	notesCol,
	pointsLedgerCol,
	profilesCol,
	progressCol,
	chapterRef,
	chaptersCol,
	conceptRef,
	conceptsCol,
	exercisesCol,
	mapImagesCol,
	sectionImagesCol,
	subjectRef,
	subjectsCol
} from './refs.ts';
import type { Chapter, ConceptRecord, Subject, WithId } from './types.ts';

// Reads for the JSON export (parent action). The pure builders are in import/catalogExport.ts;
// hidden (archived) subjects, chapters and sheets are left out.

const withId = <T>(snap: { id: string; data: () => T | undefined }): WithId<T> | null => {
	const data = snap.data();
	return data ? { id: snap.id, ...data } : null;
};

/** A sheet with its exercises and assessment. */
async function storedSheet(familyId: string, concept: WithId<ConceptRecord>): Promise<StoredSheet> {
	const [exercises, assessment, images, sectionImages] = await Promise.all([
		getDocs(exercisesCol(familyId, concept.id)),
		getDoc(assessmentRef(familyId, concept.id)),
		getDocs(mapImagesCol(familyId, concept.id)),
		getDocs(sectionImagesCol(familyId, concept.id))
	]);
	return {
		concept,
		exercises: exercises.docs.map((d) => ({ id: d.id, ...d.data() })),
		assessment: assessment.data() ?? null,
		mapImages: images.docs
			.map((d) => d.data())
			.sort((a, b) => a.order - b.order)
			.map((i) => i.dataUrl),
		sectionImages: sectionImages.docs
			.map((d) => d.data())
			.sort((a, b) => a.section - b.section || a.order - b.order)
			.map(({ section, dataUrl }) => ({ section, dataUrl }))
	};
}

/** The active sheets of a chapter, in order. */
async function chapterSheets(familyId: string, chapterId: string): Promise<StoredSheet[]> {
	const sheets = await getDocs(query(conceptsCol(familyId), where('chapterId', '==', chapterId)));
	const active = byOrder(
		activeOnly(sheets.docs.map((d) => ({ id: d.id, ...d.data() }))),
		(s) => s.title
	);
	return Promise.all(active.map((sheet) => storedSheet(familyId, sheet)));
}

/** The active chapters of a subject, in order, with their sheets. */
async function subjectContent(familyId: string, subjectId: string) {
	const chapters = await getDocs(query(chaptersCol(familyId), where('subjectId', '==', subjectId)));
	const active = byOrder(
		activeOnly(chapters.docs.map((d) => ({ id: d.id, ...d.data() }))),
		(c) => c.title
	);
	return Promise.all(
		active.map(async (chapter: WithId<Chapter>) => ({
			chapter,
			sheets: await chapterSheets(familyId, chapter.id)
		}))
	);
}

export async function exportSheet(familyId: string, conceptId: string) {
	const concept = withId(await getDoc(conceptRef(familyId, conceptId)));
	if (!concept) throw new Error(`Sheet not found: ${conceptId}`);
	return sheetExport(await storedSheet(familyId, concept));
}

export async function exportChapter(familyId: string, chapterId: string) {
	const chapter = withId(await getDoc(chapterRef(familyId, chapterId)));
	if (!chapter) throw new Error(`Chapter not found: ${chapterId}`);
	return chapterExport(chapter, await chapterSheets(familyId, chapterId));
}

export async function exportSubject(familyId: string, subjectId: string) {
	const subject = withId(await getDoc(subjectRef(familyId, subjectId)));
	if (!subject) throw new Error(`Subject not found: ${subjectId}`);
	return subjectExport(subject, await subjectContent(familyId, subjectId));
}

/** Every active subject of the family (all grades): a full backup of the binders. */
async function binderSubjects(familyId: string) {
	const subjects = await getDocs(subjectsCol(familyId));
	const active: WithId<Subject>[] = sortSubjects(
		activeOnly(subjects.docs.map((d) => ({ id: d.id, ...d.data() })))
	);
	return Promise.all(
		active.map(async (subject) => subjectDoc(subject, await subjectContent(familyId, subject.id)))
	);
}

export async function exportBinder(familyId: string) {
	return binderExport(await binderSubjects(familyId));
}

/**
 * Full backup (`family@1`): the binders and every profile with its progress, notes, runs and
 * points lines (linked devices are left out: they cannot be restored anyway).
 */
export async function exportFamily(familyId: string) {
	const rows = async (col: Query) =>
		(await getDocs(col)).docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));
	const profiles = await getDocs(profilesCol(familyId));
	const [subjects, archives] = await Promise.all([
		binderSubjects(familyId),
		Promise.all(
			profiles.docs.map(async (profile) => {
				const [progress, notes, attempts, pointsLedger] = await Promise.all([
					rows(progressCol(familyId, profile.id)),
					rows(notesCol(familyId, profile.id)),
					rows(attemptsCol(familyId, profile.id)),
					rows(pointsLedgerCol(familyId, profile.id))
				]);
				return {
					profile: { id: profile.id, ...profile.data() },
					progress,
					notes,
					attempts,
					pointsLedger
				};
			})
		)
	]);
	return familyExport(subjects, archives, new Date());
}
