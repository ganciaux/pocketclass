import { deleteDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { docSource, querySource } from './sources.ts';
import { progressCol, progressRef } from './refs.ts';
import { inBackground } from './writes.ts';

// Reading progress of a profile ("I read this sheet"). Phase 2 adds exercise results.

export const watchProgress = (familyId: string, profileId: string) =>
	querySource(progressCol(familyId, profileId));

export const watchConceptProgress = (familyId: string, profileId: string, conceptId: string) =>
	docSource(progressRef(familyId, profileId, conceptId));

/** Marks a sheet as read or unread. Works offline. */
export function setConceptRead(
	familyId: string,
	profileId: string,
	concept: { id: string; pathId: string },
	read: boolean
): void {
	const ref = progressRef(familyId, profileId, concept.id);
	inBackground(
		read ? setDoc(ref, { pathId: concept.pathId, readAt: serverTimestamp() }) : deleteDoc(ref),
		'concept read'
	);
}
