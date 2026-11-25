import { shuffle, type Random } from './series.ts';

/**
 * Timed challenge (formula C): quick questions for 60 seconds, record = right answers. Pure
 * module (unit-tested).
 */

export const CHALLENGE_SECONDS = 60;
/** Fewer quick exercises than this: the challenge would repeat them too often. */
export const CHALLENGE_MIN_EXERCISES = 4;
/** Safety cap (the rules accept up to 100 answers per attempt). */
export const CHALLENGE_MAX_ANSWERS = 100;

const QUICK_TYPES = new Set(['mcq', 'true_false', 'calculation']);

/** Exercises answered in a few seconds. */
export const challengePool = <E extends { type: string }>(exercises: E[]) =>
	exercises.filter((e) => QUICK_TYPES.has(e.type));

/**
 * An endless queue: the pool shuffled, reshuffled when used up, never the same question twice
 * in a row (when the pool has more than one).
 */
export function challengeQueue<E extends { id: string }>(pool: E[], random: Random = Math.random) {
	let queue: E[] = [];
	let previous: string | null = null;
	return (): E | null => {
		if (pool.length === 0) return null;
		if (queue.length === 0) {
			queue = shuffle(pool, random);
			if (queue.length > 1 && queue[0].id === previous) queue.push(queue.shift()!);
		}
		const next = queue.shift()!;
		previous = next.id;
		return next;
	};
}

/** The record after a challenge (null: none yet). */
export const newRecord = (best: number | null | undefined, correct: number) =>
	Math.max(best ?? 0, correct);
