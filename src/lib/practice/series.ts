/**
 * Practice series: which exercises can be played, how a series is drawn, scores. Pure module
 * (unit-tested); `random` is injectable for deterministic tests.
 */

export type Random = () => number;

type Candidate = { usage: string; type: string; archived?: boolean };

/** Active practice exercises the player can show (no assessment, no generator yet). */
export const playable = <E extends Candidate>(exercises: E[]) =>
	exercises.filter(
		(e): e is Exclude<E, { type: 'generator' }> =>
			e.usage === 'practice' && e.type !== 'generator' && !e.archived
	);

/** Fisher–Yates shuffle into a new array. */
export function shuffle<T>(items: readonly T[], random: Random = Math.random): T[] {
	const mixed = [...items];
	for (let i = mixed.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[mixed[i], mixed[j]] = [mixed[j], mixed[i]];
	}
	return mixed;
}

/** Shuffled, but never left in the original order (ordering exercises), when it can move. */
export function scramble<T>(items: readonly T[], random: Random = Math.random): T[] {
	const mixed = shuffle(items, random);
	const unchanged = mixed.every((item, i) => item === items[i]);
	return unchanged && items.length > 1 ? [...mixed.slice(1), mixed[0]] : mixed;
}

/** Default length of a series. */
export const SERIES_SIZE = 10;

/**
 * Up to `size` distinct exercises, drawn at random and spread over the key points: one per key
 * point in turn (key points in random order), until the series is full or nothing is left.
 */
export function buildSeries<E extends { keyPoint: string }>(
	exercises: E[],
	size = SERIES_SIZE,
	random: Random = Math.random
): E[] {
	const byKeyPoint = new Map<string, E[]>();
	for (const exercise of shuffle(exercises, random)) {
		byKeyPoint.set(exercise.keyPoint, [...(byKeyPoint.get(exercise.keyPoint) ?? []), exercise]);
	}
	const queues = shuffle([...byKeyPoint.values()], random);
	const series: E[] = [];
	while (series.length < size && queues.some((q) => q.length > 0)) {
		for (const queue of queues) {
			const next = queue.shift();
			if (next && series.length < size) series.push(next);
		}
	}
	return series;
}

export interface Result {
	exerciseId: string;
	correct: boolean;
}

export interface Score {
	correct: number;
	total: number;
}

export const scoreOf = (results: Result[]): Score => ({
	correct: results.filter((r) => r.correct).length,
	total: results.length
});

export const wrongIds = (results: Result[]) =>
	results.filter((r) => !r.correct).map((r) => r.exerciseId);

/** The better of two scores: higher success rate, then the longer series. */
export function betterScore(previous: Score | null | undefined, next: Score): Score {
	if (!previous || previous.total === 0) return next;
	const rate = (s: Score) => s.correct / s.total;
	if (rate(next) !== rate(previous)) return rate(next) > rate(previous) ? next : previous;
	return next.total > previous.total ? next : previous;
}
