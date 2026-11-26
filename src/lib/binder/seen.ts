import type { Profile } from '#lib/data/types.ts';
import {
	childSheets,
	sheetState,
	type SheetProgress,
	type SheetState,
	type SubjectLike
} from './binder.ts';

// "Mes fiches vues": the sheets a child already opened, searchable and drawable at random.
// Pure module (unit-tested). Structural types, like binder.ts: real records fit.

type Stamp = { toMillis(): number };
type ChapterLike = { id: string; title: string; archived: boolean };
type SheetLike = {
	id: string;
	subjectId: string;
	chapterId: string;
	title: string;
	/** Absent on sheets imported before tags existed. */
	tags?: string[];
	archived: boolean;
	updatedAt: Stamp | null;
};
type ProgressLike = SheetProgress & { id: string };

export interface SeenSheet<S = SheetLike, Su = SubjectLike, C = ChapterLike> {
	sheet: S;
	subject: Su;
	chapter: C;
	state: SheetState;
	/** Last opening in ms; Infinity while the write is pending (just opened). */
	openedAt: number;
}

/** Opened sheets the child can still reach (visible subject, active chapter), latest first. */
export function seenSheets<S extends SheetLike, Su extends SubjectLike, C extends ChapterLike>(
	binder: { subjects: Su[]; chapters: C[]; sheets: S[]; progress: ProgressLike[] },
	view: Pick<Profile, 'grade' | 'extraSubjects'>
): SeenSheet<S, Su, C>[] {
	const progress = new Map(binder.progress.map((p) => [p.id, p]));
	const entries = childSheets(binder, view).flatMap((place) => {
		const opened = progress.get(place.sheet.id);
		// A document holding only the parent's stamp: never opened, so not « seen ».
		if (opened?.openedAt === undefined) return [];
		return [
			{
				...place,
				state: sheetState(place.sheet, opened),
				openedAt: opened.openedAt?.toMillis() ?? Infinity
			}
		];
	});
	return entries.sort((a, b) => b.openedAt - a.openedAt);
}

/** Lower case, no accents, single spaces: « Équation » and « equation » match. */
export const normalize = (text: string) =>
	text
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase()
		.replace(/\s+/g, ' ')
		.trim();

/** What the search looks into: sheet title and tags, subject name, chapter title. */
export const searchText = (entry: SeenSheet) =>
	[entry.sheet.title, ...(entry.sheet.tags ?? []), entry.subject.name, entry.chapter.title].join(
		' '
	);

/**
 * The subject filter in force: null (every subject) when no seen sheet belongs to that subject
 * any more (test data reset, subject hidden by the parent), so a stale chip hides nothing.
 */
export const activeSubjectId = (entries: SeenSheet[], subjectId: string | null) =>
	subjectId && entries.some((e) => e.subject.id === subjectId) ? subjectId : null;

/** Every word of `query` must appear; `subjectId` null = every subject. */
export function filterSeen<E extends SeenSheet>(
	entries: E[],
	query: string,
	subjectId: string | null
): E[] {
	const words = normalize(query).split(' ').filter(Boolean);
	const subject = activeSubjectId(entries, subjectId);
	return entries.filter((entry) => {
		if (subject && entry.subject.id !== subject) return false;
		const text = normalize(searchText(entry));
		return words.every((word) => text.includes(word));
	});
}

/** One item at random, or null for an empty list. */
export function pickRandom<T>(items: T[], random: () => number = Math.random): T | null {
	if (items.length === 0) return null;
	return items[Math.min(items.length - 1, Math.floor(random() * items.length))];
}
