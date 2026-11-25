import { deleteField, serverTimestamp, setDoc } from 'firebase/firestore';
import { docSource, querySource } from './sources.ts';
import { progressCol, progressRef } from './refs.ts';
import type { ConceptRecord, WithId } from './types.ts';
import { inBackground } from './writes.ts';

// Progress of a profile on each sheet: opened (for "new" / "updated"), read, and the parent's
// « Acquise » stamp.
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

/** The parent stamps (or unstamps) a sheet as acquired for a profile. Works offline. */
export function setAcquired(
	familyId: string,
	profileId: string,
	sheet: SheetRef,
	acquired: boolean
): void {
	const acquiredAt = acquired ? serverTimestamp() : deleteField();
	writeProgress(familyId, profileId, sheet, { acquiredAt }, 'sheet acquired');
}

/** Mind map test: the practice questions drawn so far (saved when a test starts). Offline. */
export function saveMapDrawn(
	familyId: string,
	profileId: string,
	sheet: SheetRef,
	drawn: string[]
): void {
	writeProgress(familyId, profileId, sheet, { mapDrawn: drawn }, 'mind map draw');
}
