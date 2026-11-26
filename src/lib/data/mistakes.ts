import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '#lib/firebase.ts';
import type { StoredExercise } from '#lib/practice/generated.ts';
import { mistakes, sheetsWithMistakes } from '#lib/practice/mistakes.ts';
import { scoreOf, type Result } from '#lib/practice/series.ts';
import { attemptsCol, exercisesCol } from './refs.ts';
import { querySource, type Subscribe } from './sources.ts';
import type { AttemptRecord, ConceptRecord, WithId } from './types.ts';
import { inBackground } from './writes.ts';

// « Mes erreurs à revoir » (practice/mistakes.ts): the runs history, and the exercises of the
// sheets that still have mistakes (live, from the cache first: works offline).

export interface ReviewData {
	attempts: WithId<AttemptRecord>[];
	/** Exercises by sheet id, for the sheets with mistakes (empty list: sheet deleted). */
	exercises: Map<string, StoredExercise[]>;
}

export function watchReview(familyId: string, profileId: string): Subscribe<ReviewData> {
	return (onData, onError) => {
		let attempts: WithId<AttemptRecord>[] | null = null;
		const exercises = new Map<string, StoredExercise[]>();
		const listening = new Map<string, () => void>();
		const emit = () => {
			if (!attempts) return;
			const needed = sheetsWithMistakes(mistakes(attempts, Date.now()));
			if (needed.every((id) => exercises.has(id)))
				onData({ attempts, exercises: new Map(exercises) });
		};
		const stopAttempts = querySource(attemptsCol(familyId, profileId))((list) => {
			attempts = list;
			for (const id of sheetsWithMistakes(mistakes(list, Date.now()))) {
				if (listening.has(id)) continue;
				const stop = querySource(exercisesCol(familyId, id))((docs) => {
					exercises.set(id, docs as StoredExercise[]);
					emit();
				}, onError);
				listening.set(id, stop);
			}
			emit();
		}, onError);
		return () => {
			stopAttempts();
			listening.forEach((stop) => stop());
		};
	};
}

/**
 * A finished review: one `review` run per sheet (the history the mistakes are read from), in
 * one batch. Not awaited: works offline like every child write.
 */
export function saveReview(
	familyId: string,
	profileId: string,
	results: (Result & { sheet: Pick<WithId<ConceptRecord>, 'id' | 'subjectId' | 'chapterId'> })[]
): void {
	const bySheet = new Map<string, typeof results>();
	for (const result of results) {
		bySheet.set(result.sheet.id, [...(bySheet.get(result.sheet.id) ?? []), result]);
	}
	if (bySheet.size === 0) return;
	const batch = writeBatch(db);
	for (const list of bySheet.values()) {
		const { sheet } = list[0];
		batch.set(doc(attemptsCol(familyId, profileId)), {
			conceptId: sheet.id,
			subjectId: sheet.subjectId,
			chapterId: sheet.chapterId,
			mode: 'review',
			...scoreOf(list),
			answers: list.map(({ exerciseId, correct }) => ({ exerciseId, correct })),
			createdAt: serverTimestamp()
		});
	}
	inBackground(batch.commit(), 'practice review');
}
