import {
	arrayRemove,
	getDocs,
	query,
	updateDoc,
	where,
	type DocumentData,
	type DocumentReference,
	type Query
} from 'firebase/firestore';
import { deleteInBatches } from './batches.ts';
import {
	assessmentRef,
	attemptsCol,
	chapterRef,
	chaptersCol,
	conceptRef,
	conceptsCol,
	exercisesCol,
	mapImagesCol,
	notesCol,
	pointsLedgerCol,
	profilesCol,
	progressCol,
	subjectRef
} from './refs.ts';

// Parent deletions of the binder (online, awaited, after a typed confirmation). Hiding
// (`archived`) stays the reversible option; these remove the content for good, with what
// hangs on it: exercises, assessment, and the children's progress, attempts, points lines and
// notes on those sheets (and their notes on the deleted chapters and subject).
// Reads come from the server (getDocs) so nothing written elsewhere is left behind.

const refsOf = async (q: Query) => (await getDocs(q)).docs.map((d) => d.ref);

/** What a deletion takes along besides its sheets: notes written on these chapters / subject. */
interface NoteScope {
	chapterIds?: string[];
	subjectId?: string;
}

/**
 * Exercises, assessment and sheet documents of `sheetIds`, plus the children's progress,
 * attempts, points lines and notes on them, and their notes on the chapters / subject of `scope`.
 */
async function sheetRefs(
	familyId: string,
	sheetIds: string[],
	scope: NoteScope = {}
): Promise<DocumentReference[]> {
	const chapterIds = new Set(scope.chapterIds);
	if (sheetIds.length === 0 && chapterIds.size === 0 && !scope.subjectId) return [];
	const ids = new Set(sheetIds);
	const noteGoes = (note: DocumentData) =>
		ids.has(note.conceptId) ||
		chapterIds.has(note.chapterId) ||
		(!!scope.subjectId && note.subjectId === scope.subjectId);
	const profiles = await refsOf(profilesCol(familyId));
	const [exercises, owned] = await Promise.all([
		// Under each sheet: its exercises and its mind map pictures.
		Promise.all(
			sheetIds.flatMap((id) => [
				refsOf(exercisesCol(familyId, id)),
				refsOf(mapImagesCol(familyId, id))
			])
		),
		Promise.all(
			profiles.map(async (profile) => {
				const [progress, notes, attempts, ledger] = await Promise.all([
					getDocs(progressCol(familyId, profile.id)),
					getDocs(notesCol(familyId, profile.id)),
					getDocs(attemptsCol(familyId, profile.id)),
					getDocs(pointsLedgerCol(familyId, profile.id))
				]);
				return [
					...progress.docs.filter((d) => ids.has(d.id)),
					...attempts.docs.filter((d) => ids.has(d.data().conceptId)),
					// Points lines too (points already counted stay on the profile): a sheet
					// re-imported with the same id can be earned again.
					...ledger.docs.filter((d) => ids.has(d.data().conceptId)),
					...notes.docs.filter((d) => noteGoes(d.data()))
				].map((d) => d.ref);
			})
		)
	]);
	return [
		...owned.flat(),
		...exercises.flat(),
		...sheetIds.map((id) => assessmentRef(familyId, id)),
		...sheetIds.map((id) => conceptRef(familyId, id))
	];
}

const sheetIdsWhere = async (familyId: string, field: 'chapterId' | 'subjectId', id: string) =>
	(await getDocs(query(conceptsCol(familyId), where(field, '==', id)))).docs.map((d) => d.id);

export async function deleteSheet(familyId: string, sheetId: string): Promise<void> {
	await deleteInBatches(await sheetRefs(familyId, [sheetId]));
}

/** A chapter and all its sheets (hidden ones included). */
export async function deleteChapter(familyId: string, chapterId: string): Promise<void> {
	const sheetIds = await sheetIdsWhere(familyId, 'chapterId', chapterId);
	await deleteInBatches([
		...(await sheetRefs(familyId, sheetIds, { chapterIds: [chapterId] })),
		chapterRef(familyId, chapterId)
	]);
}

/**
 * A subject, its chapters and all its sheets (by `subjectId`: also the sheets of the old
 * path import, which have no chapter). It is removed from the children's extra subjects first.
 */
export async function deleteSubject(familyId: string, subjectId: string): Promise<void> {
	const profiles = await getDocs(
		query(profilesCol(familyId), where('extraSubjects', 'array-contains', subjectId))
	);
	await Promise.all(
		profiles.docs.map((p) => updateDoc(p.ref, { extraSubjects: arrayRemove(subjectId) }))
	);
	const [sheetIds, chapters] = await Promise.all([
		sheetIdsWhere(familyId, 'subjectId', subjectId),
		refsOf(query(chaptersCol(familyId), where('subjectId', '==', subjectId)))
	]);
	await deleteInBatches([
		...(await sheetRefs(familyId, sheetIds, {
			chapterIds: chapters.map((c) => c.id),
			subjectId
		})),
		...chapters,
		subjectRef(familyId, subjectId)
	]);
}
