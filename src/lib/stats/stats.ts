import { isAcquired, isFailed, isRead, type SheetProgress } from '#lib/binder/binder.ts';
import type { AttemptMode, ProgressRecord } from '#lib/data/types.ts';

/**
 * A child's statistics for the parent (`/parent/stats`). Pure module (unit-tested).
 * Finished runs come from the `attempts` history; started runs and sheet opens from the
 * counters on the progress documents, which only count since they were released.
 */

/** Firestore Timestamp (null while pending): only `toMillis` is used. */
type Time = { toMillis(): number };

/** The counters of a progress document (statistics). */
type Counter = 'openCount' | 'seriesStarted' | 'challengeStarted' | 'assessmentStarted';

export type StatsProgress = SheetProgress & Pick<ProgressRecord, Counter | 'challengeBest'>;

export interface StatsAttempt {
	conceptId: string;
	subjectId: string;
	mode: AttemptMode;
	correct: number;
	total: number;
	createdAt: Time | null;
}

export interface Runs {
	/** Null when runs finished before the counter existed: the count would be wrong. */
	started: number | null;
	finished: number;
}

/** Started and finished runs of one kind. */
export function runs(counter: number | undefined, finished: number): Runs {
	const started = counter ?? 0;
	return { started: started >= finished ? started : null, finished };
}

export interface GroupStats {
	sheets: number;
	read: number;
	acquired: number;
	failed: number;
	opens: number;
	series: Runs;
	challenges: Runs;
	assessments: Runs;
	/** Average score of the finished series, in percent (null: none). */
	seriesAverage: number | null;
	challengeBest: number | null;
	/** Latest open, read, stamp or finished run (milliseconds), null if nothing yet. */
	lastActivity: number | null;
}

/** Runs started and finished on one sheet (a mistakes review spans sheets: not counted). */
export type CountedMode = Exclude<AttemptMode, 'review'>;

/** The progress counter of the runs started, per mode. */
export const STARTED_FIELD = {
	series: 'seriesStarted',
	timed: 'challengeStarted',
	assessment: 'assessmentStarted'
} as const satisfies Record<CountedMode, Counter>;

/** Statistics of a set of sheets (one sheet, a chapter, a subject or the whole binder). */
export function groupStats(
	sheetIds: string[],
	progress: ReadonlyMap<string, StatsProgress>,
	attempts: StatsAttempt[]
): GroupStats {
	const ids = new Set(sheetIds);
	const own = attempts.filter((a) => ids.has(a.conceptId));
	const docs = sheetIds.map((id) => progress.get(id));
	const sum = (field: Counter) => docs.reduce((total, p) => total + (p?.[field] ?? 0), 0);
	const runsOf = (mode: CountedMode) =>
		runs(sum(STARTED_FIELD[mode]), own.filter((a) => a.mode === mode).length);

	const series = own.filter((a) => a.mode === 'series' && a.total > 0);
	const average = series.length
		? Math.round((series.reduce((s, a) => s + a.correct / a.total, 0) / series.length) * 100)
		: null;
	const records = docs.flatMap((p) => (p?.challengeBest === undefined ? [] : [p.challengeBest]));
	const times = [
		...docs.flatMap((p) => [p?.openedAt, p?.readAt, p?.acquiredAt, p?.failedAt]),
		...own.map((a) => a.createdAt)
	].flatMap((t) => (t ? [t.toMillis()] : []));

	return {
		sheets: sheetIds.length,
		read: docs.filter((p) => isRead(p)).length,
		acquired: docs.filter((p) => isAcquired(p)).length,
		failed: docs.filter((p) => isFailed(p)).length,
		opens: sum('openCount'),
		series: runsOf('series'),
		challenges: runsOf('timed'),
		assessments: runsOf('assessment'),
		seriesAverage: average,
		challengeBest: records.length ? Math.max(...records) : null,
		lastActivity: times.length ? Math.max(...times) : null
	};
}

/** The latest finished runs of a subject, newest first (pending writes on top). */
export function recentAttempts<A extends StatsAttempt>(
	attempts: A[],
	subjectId: string,
	limit = 20
): A[] {
	const when = (a: A) => a.createdAt?.toMillis() ?? Number.POSITIVE_INFINITY;
	return attempts
		.filter((a) => a.subjectId === subjectId)
		.sort((x, y) => when(y) - when(x))
		.slice(0, limit);
}
