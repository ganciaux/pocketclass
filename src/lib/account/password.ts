// Parent password: form rules and French messages for Firebase Auth errors.
// Pure module (unit-tested): the Firebase calls live in the session (auth.svelte.ts).

export const PASSWORD_MIN = 8;

export type PasswordProblem = 'tooShort' | 'mismatch';

/** What stops the form from saving this password, or null. */
export function passwordProblem(password: string, confirm: string): PasswordProblem | null {
	if (password.length < PASSWORD_MIN) return 'tooShort';
	if (password !== confirm) return 'mismatch';
	return null;
}

export type AuthErrorKey =
	| 'wrongCredentials'
	| 'tooManyRequests'
	| 'offline'
	| 'weakPassword'
	| 'alreadyUsed'
	| 'invalidEmail'
	| 'popupClosed'
	| 'generic';

const KEYS: Record<string, AuthErrorKey> = {
	// With e-mail enumeration protection (Firebase default), a wrong e-mail or password is
	// reported as `invalid-credential`; the older codes come from the emulator.
	'auth/invalid-credential': 'wrongCredentials',
	'auth/wrong-password': 'wrongCredentials',
	'auth/user-not-found': 'wrongCredentials',
	'auth/too-many-requests': 'tooManyRequests',
	'auth/network-request-failed': 'offline',
	'auth/weak-password': 'weakPassword',
	'auth/credential-already-in-use': 'alreadyUsed',
	'auth/email-already-in-use': 'alreadyUsed',
	'auth/invalid-email': 'invalidEmail',
	'auth/missing-email': 'invalidEmail',
	'auth/popup-closed-by-user': 'popupClosed',
	'auth/cancelled-popup-request': 'popupClosed'
};

/** The message to show for a Firebase Auth error code (`FirebaseError.code`). */
export const authErrorKey = (code: string | undefined): AuthErrorKey =>
	(code && KEYS[code]) || 'generic';
