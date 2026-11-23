import type { Profile } from '#lib/data/types.ts';

/** Profile display rules. Pure module (unit-tested). Limits mirror firestore.rules. */

export const NICKNAME_MAX = 24;
/** Max data URL length of an avatar (rules: 60000). */
export const AVATAR_MAX_LENGTH = 60_000;
/** Avatars are stored as small squares. */
export const AVATAR_SIZE = 128;

/** The nickname if the child chose one, otherwise the first name. */
export const displayName = (profile: Pick<Profile, 'firstName' | 'nickname'>) =>
	profile.nickname?.trim() || profile.firstName;

/** Letter shown when there is no avatar image. */
export const initialOf = (name: string) => (name.trim()[0] ?? '?').toUpperCase();

/** Largest centred square of an image (crop before resizing to AVATAR_SIZE). */
export function centerSquare(width: number, height: number) {
	const size = Math.min(width, height);
	return { x: (width - size) / 2, y: (height - size) / 2, size };
}
