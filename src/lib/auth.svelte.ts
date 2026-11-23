import {
	GoogleAuthProvider,
	onAuthStateChanged,
	signInWithPopup,
	signOut as firebaseSignOut,
	type User
} from 'firebase/auth';
import { auth } from '#lib/firebase.ts';
import { ensureFamilyForUser, getProfile } from '#lib/data/family.ts';
import type { Profile, WithId } from '#lib/data/types.ts';

type SessionStatus = 'loading' | 'signedOut' | 'ready' | 'notLinked' | 'error';

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
	/** Incremented on each auth event: a slower previous load must not overwrite a newer one. */
	#run = 0;

	start(): void {
		if (this.#started) return;
		this.#started = true;
		onAuthStateChanged(auth, (user) => void this.#load(user));
	}

	async signInWithGoogle(): Promise<void> {
		await signInWithPopup(auth, new GoogleAuthProvider());
	}

	async signOut(): Promise<void> {
		await firebaseSignOut(auth);
	}

	/** After an error (e.g. offline on first load). */
	retry(): void {
		void this.#load(auth.currentUser);
	}

	async #load(user: User | null): Promise<void> {
		const run = ++this.#run;
		this.user = user;
		this.familyId = null;
		this.profile = null;
		if (!user) {
			this.status = 'signedOut';
			return;
		}

		this.status = 'loading';
		try {
			const index = await ensureFamilyForUser(user);
			if (run !== this.#run) return;
			if (!index) {
				this.status = 'notLinked';
				return;
			}

			const profile = await getProfile(index.familyId, index.profileId);
			if (run !== this.#run) return;
			if (!profile) throw new Error(`Profile ${index.profileId} not found`);

			this.familyId = index.familyId;
			this.profile = { id: index.profileId, ...profile };
			this.status = 'ready';
		} catch (error) {
			if (run !== this.#run) return;
			console.error('[session] failed to load the family', error);
			this.status = 'error';
		}
	}
}

export const session = new Session();
