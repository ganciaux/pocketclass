import {
	addDoc,
	arrayRemove,
	arrayUnion,
	deleteDoc,
	deleteField,
	getDoc,
	getDocFromServer,
	getDocs,
	increment,
	query,
	serverTimestamp,
	setDoc,
	updateDoc,
	where
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { inviteEmail } from '#lib/account/parents.ts';
import { fr } from '#lib/i18n/fr.ts';
import {
	docSource,
	getDocCacheFirst,
	isPermissionDenied,
	querySource,
	type Subscribe
} from './sources.ts';
import { inBackground } from './writes.ts';
import { deleteInBatches } from './batches.ts';
import {
	devicesCol,
	familyRef,
	inviteRef,
	invitesCol,
	notesCol,
	profileRef,
	profilesCol,
	progressCol,
	attemptsCol,
	pointsLedgerCol,
	userRef
} from './refs.ts';
import type { Grade, Invite, ProfileLook, UserIndex, WithId, Profile } from './types.ts';

/**
 * Finds the family of a signed-in user, creating their own on a parent's first login (an
 * invitation is then offered by `<InviteBanner>`: never joined without a question). Returns null
 * when the user has no family and cannot create one (child device not linked yet).
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

/** The invitation to the signed-in parent's e-mail, if any (read from the server). */
export async function findInvite(user: User): Promise<WithId<Invite> | null> {
	const email = !user.isAnonymous && user.email ? inviteEmail(user.email) : null;
	if (!email) return null;
	const snap = await getDoc(inviteRef(email));
	return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Invited parent: becomes an admin of the family, with their own admin profile (id = uid).
 * Sequential, like a family's creation: the rules check the admins with get(), which only sees
 * committed data. A retry rewrites the same documents (the points are kept).
 */
export async function joinFamily(user: User, invite: WithId<Invite>): Promise<UserIndex> {
	const { uid } = user;
	const { familyId } = invite;
	await updateDoc(familyRef(familyId), { admins: arrayUnion(uid) });
	await setDoc(
		profileRef(familyId, uid),
		{ firstName: firstNameOf(user), role: 'admin', grade: null, points: increment(0) },
		{ merge: true }
	);
	const index: UserIndex = { familyId, profileId: uid };
	await setDoc(userRef(uid), index);
	await deleteDoc(inviteRef(invite.id));
	return index;
}

/** Invited parent: declines (the invitation is deleted). */
export const declineInvite = (email: string) => deleteDoc(inviteRef(email));

/**
 * A parent removed from a family (or who left it) goes back to their own family (id = their
 * uid): the one they had before joining, or a new empty one.
 */
export async function returnToOwnFamily(user: User): Promise<void> {
	// A family that does not exist cannot be read (the rules read its admins): only that refusal
	// means « create it ». Any other error (offline…) is thrown: never overwrite a family.
	const own = await getDocFromServer(familyRef(user.uid)).catch((error: unknown) => {
		if (isPermissionDenied(error)) return null;
		throw error;
	});
	if (own?.exists()) await setDoc(userRef(user.uid), { familyId: user.uid, profileId: user.uid });
	else await createFamilyForAdmin(user.uid, firstNameOf(user));
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
	// Merge: a retry (or a parent coming back) keeps their points, nickname and avatar.
	await setDoc(
		profileRef(uid, uid),
		{ firstName, role: 'admin', grade: null, points: increment(0) },
		{ merge: true }
	);

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
 * Parent action (online): deletes a profile for good (a child, or a parent leaving the
 * family). A child's devices go first (they lose access at once), then its progress, notes,
 * runs and points, then the profile itself.
 * Reads from the server (getDocs) so nothing written elsewhere is left behind.
 */
export async function deleteProfile(familyId: string, profileId: string): Promise<void> {
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

/** The family (its admins: the parents). */
export const watchFamily = (familyId: string) => docSource(familyRef(familyId));

/** Live parent profiles, sorted by first name. */
export const watchParentProfiles = (familyId: string): Subscribe<WithId<Profile>[]> =>
	querySource(query(profilesCol(familyId), where('role', '==', 'admin')), (profiles) =>
		[...profiles].sort((a, b) => a.firstName.localeCompare(b.firstName))
	);

/** The family's invitations waiting for their parent's first login (id = e-mail). */
export const watchInvites = (familyId: string): Subscribe<WithId<Invite>[]> =>
	querySource(query(invitesCol(), where('familyId', '==', familyId)));

/** Parent action (online): invites another parent, by their Google e-mail (`inviteEmail`). */
export async function inviteParent(
	familyId: string,
	email: string,
	by: { uid: string; name: string }
): Promise<void> {
	await setDoc(inviteRef(email), {
		familyId,
		invitedBy: by.uid,
		invitedByName: by.name.slice(0, 60),
		createdAt: serverTimestamp()
	});
}

export const cancelInvite = (email: string) => deleteDoc(inviteRef(email));

/**
 * Parent action (online): a parent leaves the family (`canRemoveParent`), with their profile and
 * test data; their next session lands in their own family (`returnToOwnFamily`). Removed by the
 * other parent: out of the admins first, then the data. Leaving oneself: the data first, while
 * still an admin. A half-done removal leaves an admin without profile, listed (« Retirer » again)
 * by `<ParentsCard>`.
 */
export async function removeParent(familyId: string, uid: string, self: boolean): Promise<void> {
	if (self) await deleteProfile(familyId, uid);
	await updateDoc(familyRef(familyId), { admins: arrayRemove(uid) });
	if (!self) await deleteProfile(familyId, uid);
}
