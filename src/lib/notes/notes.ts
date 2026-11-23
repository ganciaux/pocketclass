import type { NoteStatus } from '#lib/data/types.ts';

/** Notes ("what I found difficult"). Pure module (unit-tested). Limits mirror firestore.rules. */

export const NOTE_MAX = 1000;

interface NoteLike {
	status: NoteStatus;
	createdAt: { toMillis(): number } | null;
}

/** Newest first; a note still being written (no server time yet) is the newest. */
export const newestFirst = <N extends NoteLike>(notes: N[]) =>
	[...notes].sort(
		(a, b) => (b.createdAt?.toMillis() ?? Infinity) - (a.createdAt?.toMillis() ?? Infinity)
	);

/** Notes the parent has not looked at yet. */
export const openCount = (notes: NoteLike[]) => notes.filter((n) => n.status === 'open').length;

/** Statuses the parent can move a note to, from its current status. */
export function reviewActions(status: NoteStatus): NoteStatus[] {
	if (status === 'open') return ['seen', 'resolved'];
	if (status === 'seen') return ['resolved'];
	return ['open'];
}
