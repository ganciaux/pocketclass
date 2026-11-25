import type { PracticeScore } from '#lib/data/types.ts';

/**
 * Practice scores per sheet for the parent (« Entraînement »). Pure module (unit-tested).
 */

/** Firestore Timestamp (null while pending): only `toMillis` is used. */
type Time = { toMillis(): number } | null | undefined;

interface PracticeProgress {
	id: string;
	practiceLast?: PracticeScore;
	practiceBest?: PracticeScore;
	practicedAt?: Time;
	challengeBest?: number;
	challengedAt?: Time;
}

export interface PracticedSheet<S> {
	sheet: S;
	/** Series scores, if the sheet was practised in series. */
	last: PracticeScore | null;
	best: PracticeScore | null;
	/** Timed challenge record, if any. */
	record: number | null;
	/** Last series or challenge (milliseconds), or null while the write is pending. */
	at: number | null;
}

/** Sheets with a series or a challenge, most recent first (pending writes on top). */
export function practicedSheets<S extends { id: string }>(
	sheets: S[],
	progress: PracticeProgress[]
): PracticedSheet<S>[] {
	const byId = new Map(sheets.map((s) => [s.id, s]));
	const rows: PracticedSheet<S>[] = [];
	for (const p of progress) {
		const sheet = byId.get(p.id);
		const series = !!p.practiceLast && !!p.practiceBest;
		const challenge = p.challengeBest !== undefined;
		if (!sheet || (!series && !challenge)) continue;
		const times = [series && p.practicedAt, challenge && p.challengedAt].filter(
			(time) => time !== false
		);
		rows.push({
			sheet,
			last: p.practiceLast ?? null,
			best: p.practiceBest ?? null,
			record: p.challengeBest ?? null,
			at: times.some((time) => !time) ? null : Math.max(...times.map((time) => time!.toMillis()))
		});
	}
	return rows.sort((a, b) => (b.at ?? Infinity) - (a.at ?? Infinity));
}

/** Success rate in whole percent. */
export const percent = (score: PracticeScore) =>
	score.total === 0 ? 0 : Math.round((score.correct / score.total) * 100);
