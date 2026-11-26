import {
	arrayRemove,
	arrayUnion,
	deleteField,
	increment,
	serverTimestamp,
	setDoc
} from 'firebase/firestore';
import { docSource, querySource } from './sources.ts';
import { progressCol, progressRef } from './refs.ts';
import type { ConceptRecord, WithId } from './types.ts';
import { inBackground } from './writes.ts';
import { STARTED_FIELD, type CountedMode } from '#lib/stats/stats.ts';

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

/**
 * The child opened the sheet: it is no longer "new" or "updated". `newVisit` also counts the
 * visit (statistics), once per sheet shown. Works offline.
 */
export function markOpened(
	familyId: string,
	profileId: string,
	sheet: SheetRef,
	newVisit: boolean
): void {
	const fields = { openedAt: serverTimestamp(), ...(newVisit ? { openCount: increment(1) } : {}) };
	writeProgress(familyId, profileId, sheet, fields, 'sheet opened');
}

/** A practice series, a challenge or an assessment was started (statistics). Offline. */
export function countStart(
	familyId: string,
	profileId: string,
	sheet: SheetRef,
	mode: CountedMode
): void {
	writeProgress(
		familyId,
		profileId,
		sheet,
		{ [STARTED_FIELD[mode]]: increment(1) },
		`${mode} started`
	);
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

/** A revision card sorted in a pile (removed from the other one). Works offline. */
export function sortCard(
	familyId: string,
	profileId: string,
	sheet: SheetRef,
	cardId: string,
	pile: 'known' | 'review'
): void {
	const [into, from] =
		pile === 'known' ? ['cardsKnown', 'cardsReview'] : ['cardsReview', 'cardsKnown'];
	const fields = { [into]: arrayUnion(cardId), [from]: arrayRemove(cardId) };
	writeProgress(familyId, profileId, sheet, fields, 'card sorted');
}
