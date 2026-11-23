import { addDoc, doc, getDocs, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore';
import { fr } from '#lib/i18n/fr.ts';
import { getDocCacheFirst } from './live.ts';
import { familiesCol, profilesCol, userRef } from './refs.ts';
import type { Grade, Profile, UserIndex, WithId } from './types.ts';

/**
 * Cache-first (works offline), but "no index" is only returned when the server confirms it:
 * a cache miss must never trigger the creation of a second family.
 */
export const getUserIndex = (uid: string): Promise<UserIndex | null> =>
	getDocCacheFirst(userRef(uid));

/**
 * First parent login: create the family, the admin profile, then the users/{uid} index.
 * Sequential writes (not a batch) because the security rules check the family's `admins`
 * with get(), which only sees already committed data.
 */
export async function createFamilyForAdmin(uid: string, firstName: string): Promise<UserIndex> {
	const familyDoc = await addDoc(familiesCol(), {
		name: fr.auth.defaultFamilyName(firstName),
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
