import {
	GRADES,
	SUBJECT_COLORS,
	type Chapter,
	type Grade,
	type Profile,
	type Subject,
	type SubjectColor
} from '#lib/data/types.ts';

/**
 * The binder: subjects → chapters (optionally under a group heading) → sheets.
 * Pure module (unit-tested): visibility, ordering, sheet states and progress counts.
 */

/** A Firestore Timestamp, as far as this module is concerned (easy to fake in tests). */
type Stamp = { toMillis(): number };

type Ordered = { order: number };

/** Sorted by `order`; equal orders (two concurrent additions) fall back to `label`. */
export function byOrder<T extends Ordered>(items: T[], label: (item: T) => string): T[] {
	return [...items].sort((a, b) => a.order - b.order || label(a).localeCompare(label(b)));
}

export const activeOnly = <T extends { archived: boolean }>(items: T[]) =>
	items.filter((item) => !item.archived);

/** Order given to an item added at the end of `items`. */
export const nextOrder = (items: Ordered[]) => Math.max(-1, ...items.map((i) => i.order)) + 1;

/**
 * Moves `id` one step up (-1) or down (+1) in `items` (display order) and numbers the list
 * 0, 1, 2…: returns only the items whose order changed (nothing at either end).
 */
export function moveItem(
	items: { id: string; order: number }[],
	id: string,
	step: -1 | 1
): { id: string; order: number }[] {
	const from = items.findIndex((item) => item.id === id);
	const to = from + step;
	if (from < 0 || to < 0 || to >= items.length) return [];
	const moved = [...items];
	[moved[from], moved[to]] = [moved[to], moved[from]];
	return moved
		.map((item, order) => ({ id: item.id, order, changed: item.order !== order }))
		.filter((item) => item.changed)
		.map(({ id, order }) => ({ id, order }));
}

export type SubjectLike = { id: string } & Pick<Subject, 'name' | 'grade' | 'order' | 'archived'>;

/** A child sees a subject of their grade, or one the parent added to their binder. */
export const seesSubject = (
	profile: Pick<Profile, 'grade' | 'extraSubjects'>,
	subject: Pick<SubjectLike, 'id' | 'grade'>
) => subject.grade === profile.grade || (profile.extraSubjects ?? []).includes(subject.id);

/** Subjects a child sees: the active ones of their grade, plus the extras added by the parent. */
export function visibleSubjects<S extends SubjectLike>(
	subjects: S[],
	profile: Pick<Profile, 'grade' | 'extraSubjects'>
): S[] {
	return sortSubjects(
		activeOnly(subjects).filter((s) => seesSubject(profile, s)),
		profile.grade
	);
}

/** By grade (`firstGrade` first, then 6e → 3e), then by order within a grade. */
export function sortSubjects<S extends SubjectLike>(
	subjects: S[],
	firstGrade: Grade | null = null
): S[] {
	const rank = (s: S) => (s.grade === firstGrade ? -1 : GRADES.indexOf(s.grade));
	return byOrder(subjects, (s) => s.name).sort((a, b) => rank(a) - rank(b));
}

/** First colour not used yet by `subjects` (cycles when all are taken). */
export function freeColor(subjects: Pick<Subject, 'color'>[]): SubjectColor {
	const used = new Set(subjects.map((s) => s.color));
	return (
		SUBJECT_COLORS.find((color) => !used.has(color)) ??
		SUBJECT_COLORS[subjects.length % SUBJECT_COLORS.length]
	);
}

export interface ChapterGroup<C> {
	/** Null: chapters without a group heading. */
	group: string | null;
	chapters: C[];
}

/**
 * Chapters under their group headings, in chapter order. A group is placed where its first
 * chapter is, and collects all its chapters (even if others sit between them).
 */
export function groupChapters<C extends Pick<Chapter, 'group' | 'order' | 'title'>>(
	chapters: C[]
): ChapterGroup<C>[] {
	const groups = new Map<string | null, C[]>();
	for (const chapter of byOrder(chapters, (c) => c.title)) {
		const key = chapter.group?.trim() || null;
		groups.set(key, [...(groups.get(key) ?? []), chapter]);
	}
	return [...groups].map(([group, list]) => ({ group, chapters: list }));
}

/** Group names already used, for the suggestions of the chapter form. */
export const groupNames = (chapters: Pick<Chapter, 'group'>[]) =>
	[...new Set(chapters.map((c) => c.group?.trim()).filter((g): g is string => !!g))].sort();

/**
 * State of a sheet for a child:
 * - `new`: never opened;
 * - `updated`: re-imported since the child last opened it;
 * - `read`: marked as read;
 * - `opened`: opened, not marked as read.
 */
export type SheetState = 'new' | 'updated' | 'read' | 'opened';

export interface SheetProgress {
	/**
	 * Null while pending (server timestamp): the child has just opened it. Absent: never opened
	 * (the document only holds the parent's stamp).
	 */
	openedAt?: Stamp | null;
	/** Absent: not read. Null: marked as read, write pending. */
	readAt?: Stamp | null;
	/**
	 * The « Acquise » stamp (by the parent or a passed assessment). Absent: not acquired. Null:
	 * stamped, write pending. An acquired sheet counts as read.
	 */
	acquiredAt?: Stamp | null;
	/** The « Raté » stamp of a failed assessment (shown only while not acquired). */
	failedAt?: Stamp | null;
}

/** Stamped « Acquise » (by the parent or a passed assessment). */
export const isAcquired = (progress: SheetProgress | undefined) =>
	progress?.acquiredAt !== undefined;

/** Failed assessment, not acquired since: the « Raté » stamp. */
export const isFailed = (progress: SheetProgress | undefined) =>
	!isAcquired(progress) && progress?.failedAt !== undefined;

/** Marked as read, or acquired (an acquired sheet never needs to be marked by hand). */
export const isRead = (progress: SheetProgress | undefined) =>
	progress?.readAt !== undefined || isAcquired(progress);

export function sheetState(
	sheet: { updatedAt: Stamp | null },
	progress: SheetProgress | undefined
): SheetState {
	if (!progress) return 'new';
	const { openedAt } = progress;
	// Stamped by the parent without ever being opened: acquired, so read.
	if (openedAt === undefined) return isAcquired(progress) ? 'read' : 'new';
	if (sheet.updatedAt && openedAt && sheet.updatedAt.toMillis() > openedAt.toMillis()) {
		return 'updated';
	}
	return isRead(progress) ? 'read' : 'opened';
}

/**
 * One status per sheet for the chapter filters, by priority: acquired, failed, new (or
 * updated), read, opened.
 */
export type SheetStatus = 'new' | 'opened' | 'read' | 'acquired' | 'failed';

export const SHEET_STATUSES: SheetStatus[] = ['new', 'opened', 'read', 'acquired', 'failed'];

export function sheetStatus(
	sheet: { updatedAt: Stamp | null },
	progress: SheetProgress | undefined
): SheetStatus {
	if (isAcquired(progress)) return 'acquired';
	if (isFailed(progress)) return 'failed';
	const state = sheetState(sheet, progress);
	return state === 'updated' ? 'new' : state;
}

export interface Tally {
	total: number;
	read: number;
	/** New or updated sheets: what the child has not seen yet. */
	fresh: number;
	/** Stamped « Acquise » by the parent. */
	acquired: number;
}

type SheetLike = { id: string; updatedAt: Stamp | null };

export function tally(sheets: SheetLike[], progress: ReadonlyMap<string, SheetProgress>): Tally {
	const result: Tally = { total: sheets.length, read: 0, fresh: 0, acquired: 0 };
	for (const sheet of sheets) {
		const sheetProgress = progress.get(sheet.id);
		const state = sheetState(sheet, sheetProgress);
		if (state === 'read') result.read++;
		if (state === 'new' || state === 'updated') result.fresh++;
		if (isAcquired(sheetProgress)) result.acquired++;
	}
	return result;
}

/** One tally per subject or per chapter (`key`). Missing keys have nothing to count. */
export function tallyBy<S extends SheetLike & { subjectId: string; chapterId: string }>(
	sheets: S[],
	key: 'subjectId' | 'chapterId',
	progress: ReadonlyMap<string, SheetProgress>
): Map<string, Tally> {
	const byKey = new Map<string, S[]>();
	for (const sheet of sheets) byKey.set(sheet[key], [...(byKey.get(sheet[key]) ?? []), sheet]);
	return new Map([...byKey].map(([id, list]) => [id, tally(list, progress)]));
}

/** Sheets the child can reach: active, in an active chapter. */
export function reachableSheets<S extends { chapterId: string; archived: boolean }>(
	sheets: S[],
	chapters: { id: string; archived: boolean }[]
): S[] {
	const open = new Set(activeOnly(chapters).map((c) => c.id));
	return activeOnly(sheets).filter((s) => open.has(s.chapterId));
}

/**
 * Where a sheet stands among the active sheets of its chapter (« 3 / 6 ») and the one after it.
 * Null for a hidden or unknown sheet.
 */
export function sheetPosition<S extends Ordered & { id: string; title: string; archived: boolean }>(
	chapterSheets: S[],
	sheetId: string
): { position: number; total: number; next: S | null } | null {
	const list = byOrder(activeOnly(chapterSheets), (s) => s.title);
	const index = list.findIndex((s) => s.id === sheetId);
	if (index < 0) return null;
	return { position: index + 1, total: list.length, next: list[index + 1] ?? null };
}

/** Active sheets of active chapters in binder order: chapter after chapter, each in its order. */
export function sheetsInBinderOrder<
	S extends Ordered & { chapterId: string; title: string; archived: boolean },
	C extends Ordered & { id: string; title: string; archived: boolean }
>(sheets: S[], chapters: C[]): S[] {
	return byOrder(activeOnly(chapters), (c) => c.title).flatMap((chapter) =>
		byOrder(
			activeOnly(sheets).filter((s) => s.chapterId === chapter.id),
			(s) => s.title
		)
	);
}

/**
 * The sheets a child can reach, each with its subject and chapter: a visible subject (their
 * grade or an extra one), an active chapter, an active sheet. Base of « Mes fiches vues » and
 * « Mes révisions ».
 */
export function childSheets<
	S extends { subjectId: string; chapterId: string; archived: boolean },
	Su extends SubjectLike,
	C extends { id: string; archived: boolean }
>(
	binder: { subjects: Su[]; chapters: C[]; sheets: S[] },
	view: Pick<Profile, 'grade' | 'extraSubjects'>
): { sheet: S; subject: Su; chapter: C }[] {
	const subjects = new Map(visibleSubjects(binder.subjects, view).map((s) => [s.id, s]));
	const chapters = new Map(binder.chapters.map((c) => [c.id, c]));
	return reachableSheets(binder.sheets, binder.chapters).flatMap((sheet) => {
		const subject = subjects.get(sheet.subjectId);
		const chapter = chapters.get(sheet.chapterId);
		return subject && chapter ? [{ sheet, subject, chapter }] : [];
	});
}

/** Progress documents by sheet id. */
export const progressById = <P extends SheetProgress>(progress: (P & { id: string })[]) =>
	new Map(progress.map((p) => [p.id, p]));

/**
 * First sheet neither read nor acquired, in binder order (chapters, then sheets). Null when
 * there is none left.
 */
export function nextUnread<S extends SheetLike & Ordered & { chapterId: string; title: string }>(
	chapters: ({ id: string; title: string } & Ordered)[],
	sheets: S[],
	progress: ReadonlyMap<string, SheetProgress>
): S | null {
	for (const chapter of byOrder(chapters, (c) => c.title)) {
		const inChapter = byOrder(
			sheets.filter((s) => s.chapterId === chapter.id),
			(s) => s.title
		);
		const next = inChapter.find(
			(s) => sheetState(s, progress.get(s.id)) !== 'read' && !isAcquired(progress.get(s.id))
		);
		if (next) return next;
	}
	return null;
}
