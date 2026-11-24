import { deleteField, serverTimestamp, setDoc } from 'firebase/firestore';
import { docSource, querySource } from './sources.ts';
import { progressCol, progressRef } from './refs.ts';
import type { ConceptRecord, WithId } from './types.ts';
import { inBackground } from './writes.ts';

// Progress of a profile on each sheet: opened (for "new" / "updated") and read.
// Phase 2 adds exercise results.

type SheetRef = Pick<WithId<ConceptRecord>, 'id' | 'subjectId' | 'chapterId'>;

export const watchProgress = (familyId: string, profileId: string) =>
	querySource(progressCol(familyId, profileId));

export const watchConceptProgress = (familyId: string, profileId: string, conceptId: string) =>
	docSource(progressRef(familyId, profileId, conceptId));

function writeProgress(
	familyId: string,
	profileId: string,
	sheet: SheetRef,
	fields: Record<string, unknown>,
	label: string
) {
	const ref = progressRef(familyId, profileId, sheet.id);
	const data = { subjectId: sheet.subjectId, chapterId: sheet.chapterId, ...fields };
	inBackground(setDoc(ref, data, { merge: true }), label);
}

/** The child opened the sheet: it is no longer "new" or "updated". Works offline. */
export function markOpened(familyId: string, profileId: string, sheet: SheetRef): void {
	writeProgress(familyId, profileId, sheet, { openedAt: serverTimestamp() }, 'sheet opened');
}

/** Marks a sheet as read or unread. Works offline. */
export function setConceptRead(
	familyId: string,
	profileId: string,
	sheet: SheetRef,
	read: boolean
): void {
	const readAt = read ? serverTimestamp() : deleteField();
	writeProgress(familyId, profileId, sheet, { readAt }, 'sheet read');
}
