import type { Profile, Subject } from '#lib/data/types.ts';
import {
	reachableSheets,
	sheetState,
	visibleSubjects,
	type SheetProgress,
	type SheetState
} from './binder.ts';

// "Mes fiches vues": the sheets a child already opened, searchable and drawable at random.
// Pure module (unit-tested). Structural types, like binder.ts: real records fit.

type Stamp = { toMillis(): number };
type SubjectLike = { id: string } & Pick<Subject, 'name' | 'grade' | 'order' | 'archived'>;
type ChapterLike = { id: string; title: string; archived: boolean };
type SheetLike = {
	id: string;
	subjectId: string;
	chapterId: string;
	title: string;
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
	const subjects = new Map(visibleSubjects(binder.subjects, view).map((s) => [s.id, s]));
	const chapters = new Map(binder.chapters.map((c) => [c.id, c]));
	const progress = new Map(binder.progress.map((p) => [p.id, p]));
	const entries: SeenSheet<S, Su, C>[] = [];
	for (const sheet of reachableSheets(binder.sheets, binder.chapters)) {
		const subject = subjects.get(sheet.subjectId);
		const chapter = chapters.get(sheet.chapterId);
		const opened = progress.get(sheet.id);
		if (!subject || !chapter || !opened) continue;
		entries.push({
			sheet,
			subject,
			chapter,
			state: sheetState(sheet, opened),
			openedAt: opened.openedAt?.toMillis() ?? Infinity
		});
	}
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

/** What the search looks into (tags will join here when sheets have them). */
export const searchText = (entry: SeenSheet) =>
	[entry.sheet.title, entry.subject.name, entry.chapter.title].join(' ');

/** Every word of `query` must appear; `subjectId` null = every subject. */
export function filterSeen<E extends SeenSheet>(
	entries: E[],
	query: string,
	subjectId: string | null
): E[] {
	const words = normalize(query).split(' ').filter(Boolean);
	return entries.filter((entry) => {
		if (subjectId && entry.subject.id !== subjectId) return false;
		const text = normalize(searchText(entry));
		return words.every((word) => text.includes(word));
	});
}

/** One item at random, or null for an empty list. */
export function pickRandom<T>(items: T[], random: () => number = Math.random): T | null {
	if (items.length === 0) return null;
	return items[Math.min(items.length - 1, Math.floor(random() * items.length))];
}
