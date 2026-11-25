import {
	addDoc,
	deleteField,
	getDocs,
	query,
	serverTimestamp,
	setDoc,
	updateDoc,
	where
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { fr } from '#lib/i18n/fr.ts';
import { docSource, getDocCacheFirst, querySource, type Subscribe } from './sources.ts';
import { inBackground } from './writes.ts';
import { deleteInBatches } from './batches.ts';
import {
	devicesCol,
	familyRef,
	notesCol,
	profileRef,
	profilesCol,
	progressCol,
	attemptsCol,
	pointsLedgerCol,
	userRef
} from './refs.ts';
import type { Grade, Profile, ProfileLook, UserIndex, WithId } from './types.ts';

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

export const watchProfile = (familyId: string, profileId: string) =>
	docSource(profileRef(familyId, profileId));

/** Nickname and avatar (child or parent). Empty values remove the field. Works offline. */
export function updateProfileLook(familyId: string, profileId: string, look: ProfileLook): void {
	inBackground(
		updateDoc(profileRef(familyId, profileId), {
			nickname: look.nickname?.trim() || deleteField(),
			avatar: look.avatar || deleteField()
		}),
		'profile look'
	);
}

/** Parent: subjects of other grades this child sees too. */
export function setExtraSubjects(familyId: string, profileId: string, subjectIds: string[]): void {
	inBackground(
		updateDoc(profileRef(familyId, profileId), {
			extraSubjects: subjectIds.length > 0 ? subjectIds : deleteField()
		}),
		'extra subjects'
	);
}

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

/**
 * Parent action (online): deletes a child profile for good. Its devices go first (they lose
 * access at once), then its progress and notes, then the profile itself.
 * Reads from the server (getDocs) so nothing written elsewhere is left behind.
 */
export async function deleteChildProfile(familyId: string, profileId: string): Promise<void> {
	const [devices, ...owned] = await Promise.all([
		getDocs(query(devicesCol(familyId), where('profileId', '==', profileId))),
		getDocs(progressCol(familyId, profileId)),
		getDocs(notesCol(familyId, profileId)),
		getDocs(attemptsCol(familyId, profileId)),
		getDocs(pointsLedgerCol(familyId, profileId))
	]);
	await deleteInBatches([
		...devices.docs.map((d) => d.ref),
		...owned.flatMap((snap) => snap.docs.map((d) => d.ref)),
		profileRef(familyId, profileId)
	]);
}

/**
 * Parent action (online): clears what the parent did while testing as a child (child test
 * mode writes on the parent's own profile). Reads from the server, like a profile deletion.
 * Also takes back the points earned in test (points lines and the profile counter).
 */
export async function resetTestData(familyId: string, profileId: string): Promise<void> {
	const owned = await Promise.all([
		getDocs(progressCol(familyId, profileId)),
		getDocs(notesCol(familyId, profileId)),
		getDocs(attemptsCol(familyId, profileId)),
		getDocs(pointsLedgerCol(familyId, profileId))
	]);
	await deleteInBatches(owned.flatMap((snap) => snap.docs.map((d) => d.ref)));
	await updateDoc(profileRef(familyId, profileId), { points: 0, lastEarningId: deleteField() });
}
