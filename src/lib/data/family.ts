import {
	addDoc,
	doc,
	getDoc,
	getDocs,
	orderBy,
	query,
	serverTimestamp,
	setDoc
} from 'firebase/firestore';
import { familiesCol, profilesCol, userRef } from './refs.ts';
import type { Grade, Profile, UserIndex, WithId } from './types.ts';

export async function getUserIndex(uid: string): Promise<UserIndex | null> {
	const snap = await getDoc(userRef(uid));
	return snap.exists() ? snap.data() : null;
}

/**
 * First parent login: create the family, the admin profile, then the users/{uid} index.
 * Sequential writes (not a batch) because the security rules check the family's `admins`
 * with get(), which only sees already committed data.
 */
export async function createFamilyForAdmin(uid: string, firstName: string): Promise<UserIndex> {
	const familyDoc = await addDoc(familiesCol(), {
		name: `Famille de ${firstName}`,
		admins: [uid],
		createdAt: serverTimestamp()
	});

	const profile: Profile = { firstName, role: 'admin', grade: null, points: 0 };
	const profileDoc = doc(profilesCol(familyDoc.id));
	await setDoc(profileDoc, profile);

	const index: UserIndex = { familyId: familyDoc.id, profileId: profileDoc.id };
	await setDoc(userRef(uid), index);
	return index;
}

export async function listProfiles(familyId: string): Promise<WithId<Profile>[]> {
	const snap = await getDocs(query(profilesCol(familyId), orderBy('firstName')));
	return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createChildProfile(
	familyId: string,
	firstName: string,
	grade: Grade
): Promise<string> {
	const profile: Profile = { firstName, role: 'child', grade, points: 0 };
	const ref = await addDoc(profilesCol(familyId), profile);
	return ref.id;
}
