import type { PracticeScore } from '#lib/data/types.ts';

/**
 * Practice scores per sheet for the parent (« Entraînement »). Pure module (unit-tested).
 */

interface PracticeProgress {
	id: string;
	practiceLast?: PracticeScore;
	practiceBest?: PracticeScore;
	/** Firestore Timestamp (null while pending): only `toMillis` is used. */
	practicedAt?: { toMillis(): number } | null;
}

export interface PracticedSheet<S> {
	sheet: S;
	last: PracticeScore;
	best: PracticeScore;
	/** Milliseconds, or null while the write is pending. */
	at: number | null;
}

/** Sheets with at least one series, most recent first (pending writes on top). */
export function practicedSheets<S extends { id: string }>(
	sheets: S[],
	progress: PracticeProgress[]
): PracticedSheet<S>[] {
	const byId = new Map(sheets.map((s) => [s.id, s]));
	const rows: PracticedSheet<S>[] = [];
	for (const p of progress) {
		const sheet = byId.get(p.id);
		if (!sheet || !p.practiceLast || !p.practiceBest) continue;
		rows.push({
			sheet,
			last: p.practiceLast,
			best: p.practiceBest,
			at: p.practicedAt ? p.practicedAt.toMillis() : null
		});
	}
	return rows.sort((a, b) => (b.at ?? Infinity) - (a.at ?? Infinity));
}

/** Success rate in whole percent. */
export const percent = (score: PracticeScore) =>
	score.total === 0 ? 0 : Math.round((score.correct / score.total) * 100);
