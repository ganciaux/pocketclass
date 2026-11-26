import type { AttemptMode } from '#lib/data/types.ts';
import { generatorById } from '#lib/generators/catalog.ts';
import type { PlayableExercise } from './answers.ts';
import { instantiate, type StoredExercise } from './generated.ts';
import { shuffle, type Random } from './series.ts';

/**
 * « Mes erreurs à revoir »: a question answered wrong comes back the next day; right once, it
 * comes back 3 days later; right twice in a row, it is done. Everything is read from the runs
 * history (`attempts`): nothing new is stored. A generated question comes back as a new
 * question of the same generator. Pure module (unit-tested).
 */

const DAY_MS = 24 * 60 * 60 * 1000;
/** Wait before a question comes back, after a mistake and after one right answer. */
const AFTER_WRONG_MS = DAY_MS;
const AFTER_RIGHT_MS = 3 * DAY_MS;
/** Right answers in a row (after a mistake) that clear a question. */
const RIGHTS_TO_CLEAR = 2;
export const REVIEW_SIZE = 10;

/** Firestore Timestamp (null while pending): only `toMillis` is used. */
type Time = { toMillis(): number };

export interface MistakeAttempt {
	conceptId: string;
	mode: AttemptMode;
	answers: { exerciseId: string; correct: boolean }[];
	createdAt: Time | null;
}

export interface Mistake {
	conceptId: string;
	/** The stored exercise (for a generated question: its generator exercise). */
	exerciseId: string;
	/** Right answers since the last mistake (0 or 1). */
	rights: number;
	/** When it comes back (ms). */
	dueAt: number;
}

/** `gen-1~3` (a generated question) → `gen-1` (its generator exercise). */
export const storedId = (exerciseId: string) => exerciseId.split('~')[0];

/** The questions still to review, from every run, in time order (pending runs = now). */
export function mistakes(attempts: MistakeAttempt[], now: number): Mistake[] {
	const at = (a: MistakeAttempt) => a.createdAt?.toMillis() ?? now;
	const open = new Map<string, Mistake>();
	for (const attempt of [...attempts].sort((a, b) => at(a) - at(b))) {
		const time = at(attempt);
		for (const answer of attempt.answers) {
			const exerciseId = storedId(answer.exerciseId);
			const key = `${attempt.conceptId}/${exerciseId}`;
			const known = open.get(key);
			if (!answer.correct) {
				open.set(key, {
					conceptId: attempt.conceptId,
					exerciseId,
					rights: 0,
					dueAt: time + AFTER_WRONG_MS
				});
			} else if (known) {
				// Right answers before any mistake do not matter.
				if (known.rights + 1 >= RIGHTS_TO_CLEAR) open.delete(key);
				else open.set(key, { ...known, rights: known.rights + 1, dueAt: time + AFTER_RIGHT_MS });
			}
		}
	}
	return [...open.values()];
}

/** Due now, the longest waiting first; and the next one to come back (ms), if any. */
export function dueMistakes<M extends Mistake>(list: M[], now: number) {
	const due = list.filter((m) => m.dueAt <= now).sort((a, b) => a.dueAt - b.dueAt);
	const later = list.filter((m) => m.dueAt > now).map((m) => m.dueAt);
	return { due, nextAt: later.length ? Math.min(...later) : null };
}

/** The sheets that have questions still to review (whose exercises the review reads). */
export const sheetsWithMistakes = (list: Mistake[]) => [...new Set(list.map((m) => m.conceptId))];

/** A mistake whose exercise can be played again. */
export type Reviewable = Mistake & { stored: StoredExercise };

/**
 * Mistakes whose exercise still exists and can be played: active, a practice exercise or a
 * generator the app knows (assessment questions stay for the assessment).
 */
export function reviewable(
	list: Mistake[],
	exercises: ReadonlyMap<string, StoredExercise[]>
): Reviewable[] {
	return list.flatMap((mistake) => {
		const stored = exercises.get(mistake.conceptId)?.find((e) => e.id === mistake.exerciseId);
		if (!stored || stored.archived) return [];
		const playable =
			stored.type === 'generator'
				? generatorById(stored.generator) !== undefined
				: stored.usage === 'practice';
		return playable ? [{ ...mistake, stored }] : [];
	});
}

/**
 * The questions of a review: up to `size` of them, mixed. A generator makes a new question;
 * ids keep the stored exercise (`<id>~r` for a generated one) so the run history matches them.
 */
export function buildReview(
	items: Reviewable[],
	size = REVIEW_SIZE,
	random: Random = Math.random
): { conceptId: string; exercise: PlayableExercise }[] {
	const questions = items.slice(0, size).map(({ conceptId, stored }, i) => ({
		conceptId,
		exercise:
			stored.type === 'generator'
				? { ...instantiate(stored, i + 1, random), id: `${stored.id}~r` }
				: (stored as PlayableExercise)
	}));
	return shuffle(questions, random);
}
