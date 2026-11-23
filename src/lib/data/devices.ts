import {
	deleteDoc,
	getDocFromServer,
	query,
	where,
	serverTimestamp,
	setDoc,
	Timestamp,
	writeBatch
} from 'firebase/firestore';
import { db } from '#lib/firebase.ts';
import { generateLinkCode, LINK_CODE_TTL_MS } from '#lib/linking/linkCode.ts';
import { docSource, isPermissionDenied, querySource, type Subscribe } from './sources.ts';
import { deviceRef, devicesCol, linkCodeRef, userRef } from './refs.ts';
import type { Device, UserIndex, WithId } from './types.ts';

// Child device linking (see linking/linkCode.ts and the linkCodes rules).
// Parent: createLinkCode → shows the code. Child (anonymous account): linkDevice(uid, code).

export class InvalidLinkCodeError extends Error {
	constructor() {
		super('Invalid or expired link code');
	}
}

/** Parent action (online): a new code for `profileId`, valid LINK_CODE_TTL_MS. */
export async function createLinkCode(familyId: string, profileId: string): Promise<string> {
	const code = generateLinkCode();
	await setDoc(linkCodeRef(code), {
		familyId,
		profileId,
		expiresAt: Timestamp.fromMillis(Date.now() + LINK_CODE_TTL_MS)
	});
	return code;
}

/**
 * Child action (online): links the signed-in anonymous account `uid` with `code`.
 * One atomic batch: device entry + users/{uid} index + deletion of the code (single use).
 * The rules check the code with get() (state before the batch) and the index with getAfter().
 */
export async function linkDevice(uid: string, code: string): Promise<UserIndex> {
	let familyId: string;
	let profileId: string;
	try {
		const snap = await getDocFromServer(linkCodeRef(code));
		// Missing → not found; expired → denied by the rules. Both mean "invalid code".
		if (!snap.exists()) throw new InvalidLinkCodeError();
		({ familyId, profileId } = snap.data());
	} catch (error) {
		if (isPermissionDenied(error)) {
			throw new InvalidLinkCodeError();
		}
		throw error;
	}

	const index: UserIndex = { familyId, profileId };
	const batch = writeBatch(db);
	batch.set(deviceRef(familyId, uid), { profileId, code, linkedAt: serverTimestamp() });
	batch.set(userRef(uid), index);
	batch.delete(linkCodeRef(code));
	await batch.commit();
	return index;
}

/** Devices linked to a profile (parent view), oldest first. */
export const watchDevicesOf = (familyId: string, profileId: string): Subscribe<WithId<Device>[]> =>
	querySource(query(devicesCol(familyId), where('profileId', '==', profileId)), (devices) =>
		[...devices].sort((a, b) => (a.linkedAt?.toMillis() ?? 0) - (b.linkedAt?.toMillis() ?? 0))
	);

/** This device's own entry: null once the parent unlinks it. */
export const watchDevice = (familyId: string, uid: string) => docSource(deviceRef(familyId, uid));

/** Unlinks a device: it loses access at once (parent, or the device itself). */
export const unlinkDevice = (familyId: string, uid: string) => deleteDoc(deviceRef(familyId, uid));
