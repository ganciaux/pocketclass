import { getDoc, getDocs, query, where } from 'firebase/firestore';
import { activeOnly, byOrder, sortSubjects } from '#lib/binder/binder.ts';
import {
	binderExport,
	chapterExport,
	sheetExport,
	subjectDoc,
	subjectExport,
	type StoredSheet
} from '#lib/import/catalogExport.ts';
import {
	assessmentRef,
	chapterRef,
	chaptersCol,
	conceptRef,
	conceptsCol,
	exercisesCol,
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
	const [exercises, assessment] = await Promise.all([
		getDocs(exercisesCol(familyId, concept.id)),
		getDoc(assessmentRef(familyId, concept.id))
	]);
	return {
		concept,
		exercises: exercises.docs.map((d) => ({ id: d.id, ...d.data() })),
		assessment: assessment.data() ?? null
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
export async function exportBinder(familyId: string) {
	const subjects = await getDocs(subjectsCol(familyId));
	const active: WithId<Subject>[] = sortSubjects(
		activeOnly(subjects.docs.map((d) => ({ id: d.id, ...d.data() })))
	);
	return binderExport(
		await Promise.all(
			active.map(async (subject) => subjectDoc(subject, await subjectContent(familyId, subject.id)))
		)
	);
}
