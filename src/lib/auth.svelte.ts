import {
	deleteUser,
	EmailAuthProvider,
	GoogleAuthProvider,
	linkWithCredential,
	onAuthStateChanged,
	reauthenticateWithPopup,
	sendPasswordResetEmail,
	signInAnonymously,
	signInWithEmailAndPassword,
	signInWithPopup,
	signOut as firebaseSignOut,
	updatePassword,
	type User
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { auth } from '#lib/firebase.ts';
import { linkDevice, unlinkDevice, watchDevice } from '#lib/data/devices.ts';
import { ensureFamilyForUser, getProfile, watchProfile } from '#lib/data/family.ts';
import { isPermissionDenied } from '#lib/data/sources.ts';
import type { Profile, WithId } from '#lib/data/types.ts';
import { childViewOf } from '#lib/profile/childView.ts';
import { clearPreference, readPreference, writePreference } from '#lib/preferences.ts';

/**
 * Remembers on this device which child a parent tests as (one key per family). Storage may be
 * unavailable (private browsing): test mode then lasts the session.
 */
const testChildKey = (familyId: string) => `testChild.${familyId}`;

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
	/** The parent's account also signs in with e-mail + password (linked to the Google account). */
	hasPassword = $state(false);
	/** True while a device is being linked: keeps the link form on screen meanwhile. */
	linking = $state(false);

	/** Primitive for `live()` sources (the profile object changes with every edit). */
	profileId = $derived(this.profile?.id ?? null);
	isAdmin = $derived(this.profile?.role === 'admin');
	/** Real role: a linked child device (UI for children reads `childView`, which also covers tests). */
	isChild = $derived(this.profile?.role === 'child');

	/** Child a parent is testing as (child test mode), and that child's live profile. */
	testChildId = $state<string | null>(null);
	#testChild = $state<WithId<Profile> | null>(null);
	#stopTestChild: (() => void) | null = null;
	/**
	 * What child pages show and whose data they use: a signed-in child, or a parent testing as
	 * a child (that child's binder, the parent's own progress and notes). Null: parent view.
	 */
	childView = $derived(childViewOf(this.profile, this.#testChild));
	/** Whose progress, notes, scores and points child pages read and write (null: parent view). */
	ownerId = $derived(this.childView?.ownerId ?? null);

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

	/** Parent: sign in with the password linked to their Google account (no sign-up). */
	async signInWithPassword(email: string, password: string): Promise<void> {
		await signInWithEmailAndPassword(auth, email.trim(), password);
	}

	/** Parent: Firebase e-mail to choose a new password. */
	async sendPasswordReset(email: string): Promise<void> {
		await sendPasswordResetEmail(auth, email.trim());
	}

	/**
	 * Parent: sets the password of their account (linked to the same account, so the same
	 * family), or changes it. Firebase wants a recent sign-in for this: on
	 * `requires-recent-login`, the parent signs in with Google again, then it retries once.
	 */
	async setPassword(password: string): Promise<void> {
		const user = auth.currentUser;
		if (!user || user.isAnonymous || !user.email) throw new Error('No parent account');
		const email = user.email;
		const save = () =>
			this.hasPassword
				? updatePassword(user, password)
				: linkWithCredential(user, EmailAuthProvider.credential(email, password));
		try {
			await save();
		} catch (error) {
			if (!(error instanceof FirebaseError) || error.code !== 'auth/requires-recent-login') {
				throw error;
			}
			await reauthenticateWithPopup(user, new GoogleAuthProvider());
			await save();
		}
		this.hasPassword = true;
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

	/** Parent: use the app as this child (their binder; progress and notes on the parent). */
	startTest(childId: string): void {
		const familyId = this.familyId;
		if (!this.isAdmin || !familyId) return;
		writePreference(testChildKey(familyId), childId);
		this.#watchTestChild(familyId, childId);
	}

	/** Parent: back to the parent view (test data stays until reset). */
	stopTest(): void {
		const familyId = this.familyId;
		if (familyId) clearPreference(testChildKey(familyId));
		this.#endTest();
	}

	#watchTestChild(familyId: string, childId: string): void {
		this.#endTest();
		this.testChildId = childId;
		const run = this.#run;
		this.#stopTestChild = watchProfile(familyId, childId)(
			(child) => {
				if (run !== this.#run || this.testChildId !== childId) return;
				// Deleted (or unknown) child: the test stops by itself.
				if (child) this.#testChild = child;
				else this.stopTest();
			},
			(error) => {
				console.error('[session] test child', error);
				if (run === this.#run && this.testChildId === childId) this.stopTest();
			}
		);
	}

	#endTest(): void {
		this.#stopTestChild?.();
		this.#stopTestChild = null;
		this.testChildId = null;
		this.#testChild = null;
	}

	/** After an error (e.g. offline on first load). */
	retry(): void {
		void this.#load(auth.currentUser);
	}

	#reset(status: SessionStatus): void {
		for (const stop of this.#stops) stop();
		this.#stops = [];
		this.#endTest();
		this.familyId = null;
		this.profile = null;
		this.status = status;
	}

	async #load(user: User | null): Promise<void> {
		const run = ++this.#run;
		this.user = user;
		if (!user) return this.#reset('signedOut');

		this.#reset('loading');
		this.hasPassword = user.providerData.some((p) => p.providerId === 'password');
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
			// A parent resumes the child test mode remembered on this device.
			if (profile.role === 'admin') {
				// iOS may clear an installed web app's data (and the session with it): ask to keep it.
				navigator.storage?.persist?.().catch(() => {});
				const testChildId = readPreference(testChildKey(index.familyId));
				if (testChildId) this.#watchTestChild(index.familyId, testChildId);
			}
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
