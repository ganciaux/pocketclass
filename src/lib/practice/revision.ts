import { reachableSheets, visibleSubjects } from '#lib/binder/binder.ts';
import type { Profile, Subject } from '#lib/data/types.ts';
import { passed } from './assessment.ts';
import type { Score } from './series.ts';

/**
 * Revision points (phase 3): once a sheet is acquired, a practice series at 70 % or more earns
 * 2 points per key point, then nothing on that sheet for a week (the hourglass). Pure module
 * (unit-tested); the rules check the same conditions.
 */

export const REVISION_PASS_RATE = 70;
export const REVISION_POINTS_PER_KEY_POINT = 2;
export const REVISION_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
/**
 * Margin on the device's clock: the rules compare with the server time, and a refused revision
 * would lose the whole series batch.
 */
const CLOCK_MARGIN_MS = 5 * 60 * 1000;

type Stamp = { toMillis(): number };

export interface RevisionProgress {
	acquiredAt?: unknown;
	/** Last paid revision (null: write pending, just now). */
	revisedAt?: Stamp | null;
	revisionCount?: number;
}

export type RevisionStatus =
	/** Not acquired: practice earns no revision points. */
	| { kind: 'none' }
	| { kind: 'ready' }
	/** `readyAt` in ms. */
	| { kind: 'waiting'; readyAt: number };

export function revisionStatus(
	progress: RevisionProgress | null | undefined,
	now: number
): RevisionStatus {
	if (progress?.acquiredAt === undefined) return { kind: 'none' };
	if (progress.revisedAt === undefined) return { kind: 'ready' };
	const last = progress.revisedAt?.toMillis() ?? now;
	const readyAt = last + REVISION_COOLDOWN_MS + CLOCK_MARGIN_MS;
	return now >= readyAt ? { kind: 'ready' } : { kind: 'waiting', readyAt };
}

export const revisionPoints = (keyPointCount: number) =>
	REVISION_POINTS_PER_KEY_POINT * keyPointCount;

/** What a finished series earns as a revision: null when nothing (not ready, under 70 %). */
export function revisionOutcome(
	score: Score,
	progress: RevisionProgress | null | undefined,
	keyPointCount: number,
	now: number
): { earned: number; count: number } | null {
	if (revisionStatus(progress, now).kind !== 'ready') return null;
	if (!passed(score, REVISION_PASS_RATE)) return null;
	return { earned: revisionPoints(keyPointCount), count: (progress?.revisionCount ?? 0) + 1 };
}

/** Ledger id of the n-th revision of a sheet (deterministic: a line is counted once). */
export const revisionEntryId = (conceptId: string, count: number) =>
	`revision-${conceptId}-${count}`;

/** Time left, rounded up to the minute, in days / hours / minutes (for the hourglass). */
export function timeLeft(ms: number): { days: number; hours: number; minutes: number } {
	const minutes = Math.max(0, Math.ceil(ms / 60_000));
	return {
		days: Math.floor(minutes / (24 * 60)),
		hours: Math.floor((minutes % (24 * 60)) / 60),
		minutes: minutes % 60
	};
}

/** « Mes révisions »: acquired sheets, ready ones first (in the given order), then by wait. */
export function revisionList<S extends { id: string }>(
	sheets: S[],
	progress: ReadonlyMap<string, RevisionProgress>,
	now: number
): { sheet: S; status: Exclude<RevisionStatus, { kind: 'none' }> }[] {
	const entries = sheets.flatMap((sheet) => {
		const status = revisionStatus(progress.get(sheet.id), now);
		return status.kind === 'none' ? [] : [{ sheet, status }];
	});
	const wait = (s: RevisionStatus) => (s.kind === 'waiting' ? s.readyAt : 0);
	return entries.sort((a, b) => wait(a.status) - wait(b.status));
}

type SubjectLike = { id: string } & Pick<Subject, 'name' | 'grade' | 'order' | 'archived'>;
type SheetLike = { id: string; subjectId: string; chapterId: string; archived: boolean };

/** The revisions of a child's binder (visible subjects, reachable sheets), with their place. */
export function binderRevisions<
	S extends SheetLike,
	Su extends SubjectLike,
	C extends { id: string; archived: boolean }
>(
	binder: {
		subjects: Su[];
		chapters: C[];
		sheets: S[];
		progress: (RevisionProgress & { id: string })[];
	},
	view: Pick<Profile, 'grade' | 'extraSubjects'>,
	now: number
) {
	const subjects = new Map(visibleSubjects(binder.subjects, view).map((s) => [s.id, s]));
	const chapters = new Map(binder.chapters.map((c) => [c.id, c]));
	const sheets = reachableSheets(binder.sheets, binder.chapters).filter((s) =>
		subjects.has(s.subjectId)
	);
	const progress = new Map(binder.progress.map((p) => [p.id, p]));
	return revisionList(sheets, progress, now).map((entry) => ({
		...entry,
		subject: subjects.get(entry.sheet.subjectId)!,
		chapter: chapters.get(entry.sheet.chapterId)!
	}));
}
