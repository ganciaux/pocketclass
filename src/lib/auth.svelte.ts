import {
	GoogleAuthProvider,
	onAuthStateChanged,
	signInWithPopup,
	signOut as firebaseSignOut,
	type User
} from 'firebase/auth';
import { getDoc } from 'firebase/firestore';
import { auth } from '#lib/firebase.ts';
import { createFamilyForAdmin, getUserIndex } from '#lib/data/family.ts';
import { profileRef } from '#lib/data/refs.ts';
import type { Profile, WithId } from '#lib/data/types.ts';

type SessionStatus = 'loading' | 'signedOut' | 'ready' | 'error';

/**
 * Current user, family and profile. A single instance shared by the whole app.
 * Call `start()` once from the root layout.
 */
class Session {
	status = $state<SessionStatus>('loading');
	user = $state<User | null>(null);
	familyId = $state<string | null>(null);
	profile = $state<WithId<Profile> | null>(null);

	isAdmin = $derived(this.profile?.role === 'admin');

	#started = false;

	start(): void {
		if (this.#started) return;
		this.#started = true;
		onAuthStateChanged(auth, (user) => void this.#onUser(user));
	}

	async signInWithGoogle(): Promise<void> {
		await signInWithPopup(auth, new GoogleAuthProvider());
	}

	async signOut(): Promise<void> {
		await firebaseSignOut(auth);
	}

	async #onUser(user: User | null): Promise<void> {
		this.user = user;
		if (!user) {
			this.familyId = null;
			this.profile = null;
			this.status = 'signedOut';
			return;
		}

		this.status = 'loading';
		try {
			let index = await getUserIndex(user.uid);
			// First parent login (Google). Anonymous child devices are linked in phase 5.
			if (!index && !user.isAnonymous) {
				index = await createFamilyForAdmin(user.uid, firstNameOf(user));
			}
			if (!index) {
				this.status = 'error';
				return;
			}

			const snap = await getDoc(profileRef(index.familyId, index.profileId));
			if (!snap.exists()) throw new Error(`Profile ${index.profileId} not found`);

			this.familyId = index.familyId;
			this.profile = { id: snap.id, ...snap.data() };
			this.status = 'ready';
		} catch (error) {
			console.error('[session] failed to load the family', error);
			this.status = 'error';
		}
	}
}

function firstNameOf(user: User): string {
	return user.displayName?.split(' ')[0]?.trim() || 'Parent';
}

export const session = new Session();
