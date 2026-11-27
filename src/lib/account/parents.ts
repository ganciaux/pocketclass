// Co-parents: two (or more) parents administer the same family, with equal rights. A parent
// invites another by their Google e-mail; the invitation is read at the invited parent's sign-in.
// Pure module (unit-tested): the Firestore calls live in `data/family.ts`.

/** An e-mail as an invitation id: trimmed, lower case; null when it is not an e-mail. */
export function inviteEmail(raw: string): string | null {
	const email = raw.trim().toLowerCase();
	return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? email : null;
}

/**
 * Whether `uid` may be removed from the family's admins. Mirrors the rules: the family keeps an
 * admin, and the parent who created it (family id = their uid) stays.
 */
export function canRemoveParent(familyId: string, admins: readonly string[], uid: string): boolean {
	return uid !== familyId && admins.includes(uid) && admins.length > 1;
}
