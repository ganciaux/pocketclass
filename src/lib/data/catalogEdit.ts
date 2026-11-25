import { deleteField, doc, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '#lib/firebase.ts';
import { COLLECTIONS } from './collections.ts';
import { assessmentRef, chaptersCol, familyDoc, subjectsCol } from './refs.ts';
import type { AssessmentSettingsRecord, Chapter, Subject } from './types.ts';
import { inBackground } from './writes.ts';

// Parent edits of the binder (subjects, chapters, sheet order). Plain writes with no server
// read: they work offline like the child's writes (local cache first, synced later).

/** Catalogue collections that can be reordered and archived. */
export type CatalogKind = 'subjects' | 'chapters' | 'concepts';

/** Creates a subject and returns its (generated) id at once. */
export function createSubject(familyId: string, subject: Omit<Subject, 'archived'>): string {
	const ref = doc(subjectsCol(familyId));
	inBackground(setDoc(ref, { ...subject, archived: false }), 'create subject');
	return ref.id;
}

/** Name, colour, icon and image of a subject. `image: null` removes the image. */
export function updateSubject(
	familyId: string,
	subjectId: string,
	{ image, ...patch }: Partial<Pick<Subject, 'name' | 'color' | 'icon'>> & { image?: string | null }
): void {
	const ref = familyDoc(familyId, COLLECTIONS.subjects, subjectId);
	const imageField = image === undefined ? {} : { image: image ?? deleteField() };
	inBackground(updateDoc(ref, { ...patch, ...imageField }), 'update subject');
}

export function createChapter(familyId: string, chapter: Omit<Chapter, 'archived'>): string {
	const ref = doc(chaptersCol(familyId));
	inBackground(setDoc(ref, { ...chapter, archived: false }), 'create chapter');
	return ref.id;
}

export function updateChapter(
	familyId: string,
	chapterId: string,
	patch: Partial<Pick<Chapter, 'title' | 'group'>>
): void {
	const ref = familyDoc(familyId, COLLECTIONS.chapters, chapterId);
	inBackground(updateDoc(ref, patch), 'update chapter');
}

/** Hides (or restores) a subject, chapter or sheet: reversible (deletion: `catalogDelete.ts`). */
export function setArchived(familyId: string, kind: CatalogKind, id: string, archived: boolean) {
	inBackground(updateDoc(familyDoc(familyId, COLLECTIONS[kind], id), { archived }), 'archive');
}

/** Saves new positions (from `moveItem`) in one batch. */
export function saveOrder(
	familyId: string,
	kind: CatalogKind,
	items: { id: string; order: number }[]
) {
	if (items.length === 0) return;
	const batch = writeBatch(db);
	for (const { id, order } of items) {
		batch.update(familyDoc(familyId, COLLECTIONS[kind], id), { order });
	}
	inBackground(batch.commit(), 'reorder');
}

/**
 * The assessment settings of a sheet (pass rate %, points); `null` goes back to the default.
 * Kept by a new import of the sheet.
 */
export function setAssessmentSettings(
	familyId: string,
	conceptId: string,
	settings: { [K in keyof AssessmentSettingsRecord]-?: number | null }
): void {
	const value = (n: number | null) => n ?? deleteField();
	inBackground(
		setDoc(
			assessmentRef(familyId, conceptId),
			{ passRate: value(settings.passRate), points: value(settings.points) },
			{ merge: true }
		),
		'assessment settings'
	);
}
