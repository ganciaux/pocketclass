import type { Grade, Profile, WithId } from '#lib/data/types.ts';
import { displayName } from './display.ts';

/**
 * What the child pages show and whose data they use. A child sees their own binder and owns
 * their progress; a parent testing as a child sees that child's binder (grade and extra
 * subjects) but reads and writes on their own profile, so a test never touches a child's data.
 * Pure module (unit-tested).
 */
export interface ChildView {
	/** Profile whose progress and notes are read and written. */
	ownerId: string;
	/** Decides the visible subjects (with `extraSubjects`). */
	grade: Grade | null;
	extraSubjects: string[];
	/** Name shown to the child ("Bonjour …"). */
	name: string;
	/** True when a parent is testing. */
	testing: boolean;
}

export function childViewOf(
	profile: WithId<Profile> | null,
	testChild: WithId<Profile> | null
): ChildView | null {
	if (profile?.role === 'child') return viewOf(profile, profile.id, false);
	if (profile?.role === 'admin' && testChild?.role === 'child') {
		return viewOf(testChild, profile.id, true);
	}
	return null;
}

const viewOf = (child: Profile, ownerId: string, testing: boolean): ChildView => ({
	ownerId,
	grade: child.grade,
	extraSubjects: child.extraSubjects ?? [],
	name: displayName(child),
	testing
});
