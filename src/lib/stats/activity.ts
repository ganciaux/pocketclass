import { passed, DEFAULT_PASS_RATE } from '#lib/practice/assessment.ts';
import type { AttemptMode } from '#lib/data/types.ts';

/**
 * Activity history of a profile (« Mon activité » and the parent's statistics): the finished
 * runs (`attempts`) with the points they earned (`pointsLedger`), grouped by day. Nothing new
 * is stored: a points line is written in the same batch as its run, so both carry the same
 * server time. Pure module (unit-tested).
 */

/** Firestore Timestamp (null while pending): only `toMillis` is used. */
type Time = { toMillis(): number };

export interface ActivityAttempt {
	id: string;
	conceptId: string;
	subjectId: string;
	mode: AttemptMode;
	correct: number;
	total: number;
	createdAt: Time | null;
}

export interface ActivityLine {
	id: string;
	kind: 'assessment' | 'revision';
	conceptId: string;
	subjectId: string;
	amount: number;
	createdAt: Time | null;
}

export interface ActivityEntry {
	id: string;
	conceptId: string;
	subjectId: string;
	/** `points`: a points line whose run is not in the history (shown on its own). */
	kind: AttemptMode | 'points';
	score: { correct: number; total: number } | null;
	/** Assessments: at the sheet's pass rate. */
	passed: boolean | null;
	/** Points earned by this run (assessment or revision), 0 if none. */
	points: number;
	/** Ms; Infinity while the write is pending (just finished). */
	at: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const millis = (time: Time | null) => time?.toMillis() ?? Number.POSITIVE_INFINITY;

/** The run kind a points line belongs to. */
const RUN_OF: Record<ActivityLine['kind'], AttemptMode> = {
	assessment: 'assessment',
	revision: 'series'
};

/** Runs with their points, newest first. `passRates`: by sheet id (70 % when absent). */
export function activityEntries(
	attempts: ActivityAttempt[],
	lines: ActivityLine[],
	passRates: ReadonlyMap<string, number> = new Map()
): ActivityEntry[] {
	// Points lines by « sheet · run kind · time »: the key of the run of the same batch.
	const key = (conceptId: string, mode: AttemptMode, time: Time | null) =>
		`${conceptId}·${mode}·${millis(time)}`;
	const unmatched = new Map(lines.map((l) => [key(l.conceptId, RUN_OF[l.kind], l.createdAt), l]));

	const entries: ActivityEntry[] = attempts.map((a) => {
		const k = key(a.conceptId, a.mode, a.createdAt);
		const line = unmatched.get(k);
		unmatched.delete(k);
		const score = { correct: a.correct, total: a.total };
		return {
			id: a.id,
			conceptId: a.conceptId,
			subjectId: a.subjectId,
			kind: a.mode,
			score,
			passed:
				a.mode === 'assessment'
					? passed(score, passRates.get(a.conceptId) ?? DEFAULT_PASS_RATE)
					: null,
			points: line?.amount ?? 0,
			at: millis(a.createdAt)
		};
	});
	for (const line of unmatched.values()) {
		entries.push({
			id: line.id,
			conceptId: line.conceptId,
			subjectId: line.subjectId,
			kind: 'points',
			score: null,
			passed: null,
			points: line.amount,
			at: millis(line.createdAt)
		});
	}
	return entries.sort((a, b) => b.at - a.at);
}

/** Midnight (local time) of the day of `ms`. */
const startOfDay = (ms: number) => {
	const date = new Date(ms);
	date.setHours(0, 0, 0, 0);
	return date.getTime();
};

export interface ActivityDay {
	/** Midnight of the day (local time). */
	day: number;
	/** 0 = today, 1 = yesterday… */
	daysAgo: number;
	entries: ActivityEntry[];
	points: number;
}

/**
 * The entries of the last `days` days (today included), one group per day, newest first;
 * `more`: older entries exist (« Voir plus »).
 */
export function activityDays(
	entries: ActivityEntry[],
	now: number,
	days: number
): { days: ActivityDay[]; more: boolean } {
	const today = startOfDay(now);
	// Calendar days, not 24 h steps: a clock change in the window must not drop a day.
	const first = new Date(today);
	first.setDate(first.getDate() - (days - 1));
	const from = first.getTime();
	const groups = new Map<number, ActivityEntry[]>();
	let more = false;
	for (const entry of entries) {
		// A pending write is from just now.
		const day = entry.at === Number.POSITIVE_INFINITY ? today : startOfDay(entry.at);
		if (day < from) {
			more = true;
			continue;
		}
		groups.set(day, [...(groups.get(day) ?? []), entry]);
	}
	return {
		days: [...groups].map(([day, list]) => ({
			day,
			daysAgo: Math.round((today - day) / DAY_MS),
			entries: list,
			points: list.reduce((sum, e) => sum + e.points, 0)
		})),
		more
	};
}
