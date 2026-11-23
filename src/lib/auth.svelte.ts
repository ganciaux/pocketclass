import {
	deleteUser,
	GoogleAuthProvider,
	onAuthStateChanged,
	signInAnonymously,
	signInWithPopup,
	signOut as firebaseSignOut,
	type User
} from 'firebase/auth';
import { auth } from '#lib/firebase.ts';
import { linkDevice, unlinkDevice, watchDevice } from '#lib/data/devices.ts';
import { ensureFamilyForUser, getProfile, watchProfile } from '#lib/data/family.ts';
import { isPermissionDenied } from '#lib/data/sources.ts';
import type { Profile, WithId } from '#lib/data/types.ts';

type SessionStatus = 'loading' | 'signedOut' | 'ready' | 'notLinked' | 'error';

/**
 * Current user, family and profile. A single instance shared by the whole app.
 * Call `start()` once from the root layout.
 *
 * Parents sign in with Google. Children link their device with a code from the parent: an
 * anonymous account becomes `families/{f}/devices/{uid}` (it stays signed in on that device).
 */
class Session {
	status = $state<SessionStatus>('loading');
	user = $state<User | null>(null);
	familyId = $state<string | null>(null);
	/** Live: nickname or avatar changes show at once. */
	profile = $state<WithId<Profile> | null>(null);
	/** True while a device is being linked: keeps the link form on screen meanwhile. */
	linking = $state(false);

	/** Primitive for `live()` sources (the profile object changes with every edit). */
	profileId = $derived(this.profile?.id ?? null);
	isAdmin = $derived(this.profile?.role === 'admin');
	isChild = $derived(this.profile?.role === 'child');
	/** The profile id when a child is signed in (progress and notes are children-only). */
	childId = $derived(this.isChild ? this.profileId : null);

	#started = false;
	/** Incremented on each load: a slower previous load must not overwrite a newer one. */
	#run = 0;
	/** Live listeners of the loaded session (profile, and the device entry for a child). */
	#stops: (() => void)[] = [];

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

	/** Child device: signs in anonymously (once) and links the account with the parent's code. */
	async linkDevice(code: string): Promise<void> {
		this.linking = true;
		try {
			const current = auth.currentUser;
			if (current && !current.isAnonymous) throw new Error('Already signed in as a parent');
			const user = current ?? (await signInAnonymously(auth)).user;
			await linkDevice(user.uid, code);
			// The anonymous account only lives in this browser's storage: ask not to evict it.
			navigator.storage?.persist?.().catch(() => {});
			await this.#load(user);
		} finally {
			this.linking = false;
		}
	}

	/** Child device: removes the link and the anonymous account (a new code is then needed). */
	async unlinkThisDevice(): Promise<void> {
		const user = auth.currentUser;
		if (!user?.isAnonymous) return;
		if (this.familyId) await unlinkDevice(this.familyId, user.uid);
		try {
			await deleteUser(user);
		} catch (error) {
			console.error('[session] anonymous account not deleted', error);
			await firebaseSignOut(auth);
		}
	}

	/** After an error (e.g. offline on first load). */
	retry(): void {
		void this.#load(auth.currentUser);
	}

	#reset(status: SessionStatus): void {
		for (const stop of this.#stops) stop();
		this.#stops = [];
		this.familyId = null;
		this.profile = null;
		this.status = status;
	}

	async #load(user: User | null): Promise<void> {
		const run = ++this.#run;
		this.user = user;
		if (!user) return this.#reset('signedOut');

		this.#reset('loading');
		try {
			const index = await ensureFamilyForUser(user);
			if (run !== this.#run) return;
			if (!index) return this.#reset('notLinked');

			const profile = await getProfile(index.familyId, index.profileId);
			if (run !== this.#run) return;
			if (!profile) throw new Error(`Profile ${index.profileId} not found`);

			this.familyId = index.familyId;
			this.profile = { id: index.profileId, ...profile };
			this.status = 'ready';
			const onError = (error: Error) => {
				if (run !== this.#run) return;
				console.error('[session] live', error);
				this.#reset(isPermissionDenied(error) ? 'notLinked' : 'error');
			};
			this.#stops.push(
				watchProfile(index.familyId, index.profileId)((live) => {
					if (live) this.profile = live;
				}, onError)
			);
			// Open listeners are not re-checked when access is revoked: a child device watches
			// its own entry to notice at once that the parent unlinked it.
			if (user.isAnonymous) {
				this.#stops.push(
					watchDevice(index.familyId, user.uid)((device) => {
						if (!device && run === this.#run) this.#reset('notLinked');
					}, onError)
				);
			}
		} catch (error) {
			if (run !== this.#run) return;
			console.error('[session] failed to load the family', error);
			// A device unlinked by the parent can no longer read its profile.
			this.#reset(isPermissionDenied(error) ? 'notLinked' : 'error');
		}
	}
}

export const session = new Session();
