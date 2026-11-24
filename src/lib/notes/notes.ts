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

/** What a note written from the floating button is about: the page's chapter or subject. */
export type NoteContext = { kind: 'chapter' | 'subject'; id: string } | { kind: 'free' };

/** Child pages where a note is free (not about a part of the binder). */
const FREE_NOTE_ROUTES = new Set(['/', '/me', '/me/sheets', '/me/notes']);

/**
 * The target of a note written on the page `routeId` (SvelteKit route id), or null where the
 * floating button is hidden: a sheet (it has its own form), the parent space, other pages.
 */
export function noteContext(
	routeId: string | null,
	params: Record<string, string | undefined>
): NoteContext | null {
	if (routeId && FREE_NOTE_ROUTES.has(routeId)) return { kind: 'free' };
	if (!params.id) return null;
	if (routeId === '/chapter/[id]') return { kind: 'chapter', id: params.id };
	if (routeId === '/subject/[id]') return { kind: 'subject', id: params.id };
	return null;
}

/** Where a note was written; `gone`: that sheet, chapter or subject is deleted or hidden. */
export type NotePlace =
	| { kind: 'sheet'; id: string; title: string }
	| { kind: 'chapter'; id: string; title: string }
	| { kind: 'subject'; id: string; title: string }
	| { kind: 'free' }
	| { kind: 'gone'; of: 'sheet' | 'chapter' | 'subject' };

interface NoteTargetLike {
	conceptId?: string | null;
	chapterId?: string | null;
	/** Absent on notes written before notes could be about a subject. */
	subjectId?: string | null;
}

/** Titles (sheets, chapters) and names (subjects) the child can still reach, by id. */
export interface NoteCatalog {
	sheets: ReadonlyMap<string, string>;
	chapters: ReadonlyMap<string, string>;
	subjects: ReadonlyMap<string, string>;
}

/** The most precise place of a note: its sheet, else its chapter, else its subject, else free. */
export function notePlace(note: NoteTargetLike, catalog: NoteCatalog): NotePlace {
	const levels = [
		['sheet', note.conceptId, catalog.sheets],
		['chapter', note.chapterId, catalog.chapters],
		['subject', note.subjectId, catalog.subjects]
	] as const;
	for (const [kind, id, titles] of levels) {
		if (!id) continue;
		const title = titles.get(id);
		return title === undefined ? { kind: 'gone', of: kind } : { kind, id, title };
	}
	return { kind: 'free' };
}
