import { addDoc, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { fr } from '#lib/i18n/fr.ts';
import { getDocCacheFirst, querySource, type Subscribe } from './sources.ts';
import { familyRef, profileRef, profilesCol, userRef } from './refs.ts';
import type { Grade, Profile, UserIndex, WithId } from './types.ts';

/**
 * Finds the family of a signed-in user, creating it on the first parent login.
 * Returns null when the user has no family and cannot create one (anonymous child device,
 * linked in phase 5).
 *
 * Cache-first (works offline), but "no index" is only trusted when the server confirms it:
 * a cache miss must never trigger the creation of a family.
 */
export async function ensureFamilyForUser(user: User): Promise<UserIndex | null> {
	const index = await getDocCacheFirst(userRef(user.uid));
	if (index) return index;
	if (user.isAnonymous) return null;
	return createFamilyForAdmin(user.uid, firstNameOf(user));
}

function firstNameOf(user: User): string {
	return user.displayName?.split(' ')[0]?.trim() || fr.auth.defaultAdminName;
}

/**
 * First parent login. Idempotent: family id and admin profile id are the parent's uid, so a
 * retry after a partial failure rewrites the same documents instead of creating a second family.
 * Sequential writes (not a batch): the rules check `admins` with get(), which only sees
 * committed data. The users/{uid} index is written last: it marks the bootstrap as complete.
 */
async function createFamilyForAdmin(uid: string, firstName: string): Promise<UserIndex> {
	await setDoc(familyRef(uid), {
		name: fr.auth.defaultFamilyName(firstName),
		admins: [uid],
		createdAt: serverTimestamp()
	});
	const profile: Profile = { firstName, role: 'admin', grade: null, points: 0 };
	await setDoc(profileRef(uid, uid), profile);

	const index: UserIndex = { familyId: uid, profileId: uid };
	await setDoc(userRef(uid), index);
	return index;
}

export const getProfile = (familyId: string, profileId: string) =>
	getDocCacheFirst(profileRef(familyId, profileId));

/** Live child profiles, sorted by first name (client-side: no composite index). */
export const watchChildProfiles = (familyId: string): Subscribe<WithId<Profile>[]> =>
	querySource(query(profilesCol(familyId), where('role', '==', 'child')), (profiles) =>
		[...profiles].sort((a, b) => a.firstName.localeCompare(b.firstName))
	);

export async function createChildProfile(
	familyId: string,
	firstName: string,
	grade: Grade
): Promise<string> {
	const profile: Profile = { firstName, role: 'child', grade, points: 0 };
	const ref = await addDoc(profilesCol(familyId), profile);
	return ref.id;
}
