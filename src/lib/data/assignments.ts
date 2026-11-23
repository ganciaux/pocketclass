import { deleteDoc, getDoc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';
import { assignmentRef, assignmentsCol } from './refs.ts';

/** Ids of the profiles (among `profileIds`) that already have `pathId` assigned. */
export async function profilesAssignedTo(
	familyId: string,
	pathId: string,
	profileIds: string[]
): Promise<string[]> {
	const snaps = await Promise.all(
		profileIds.map((id) => getDoc(assignmentRef(familyId, id, pathId)))
	);
	return profileIds.filter((_, i) => snaps[i].exists());
}

/** Makes `pathId` assigned exactly to `selected` among `profileIds`. Keeps `since` if unchanged. */
export async function setPathAssignments(
	familyId: string,
	pathId: string,
	profileIds: string[],
	selected: string[]
): Promise<void> {
	const current = new Set(await profilesAssignedTo(familyId, pathId, profileIds));
	const wanted = new Set(selected);
	await Promise.all(
		profileIds.map((id) => {
			if (wanted.has(id) && !current.has(id)) {
				return setDoc(assignmentRef(familyId, id, pathId), { since: serverTimestamp() });
			}
			if (!wanted.has(id) && current.has(id)) {
				return deleteDoc(assignmentRef(familyId, id, pathId));
			}
		})
	);
}

export async function assignedPathIds(familyId: string, profileId: string): Promise<string[]> {
	const snap = await getDocs(assignmentsCol(familyId, profileId));
	return snap.docs.map((d) => d.id);
}
