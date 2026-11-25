import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '#lib/firebase.ts';
import type { PlayableExercise } from '#lib/practice/answers.ts';
import { betterScore, playable, scoreOf, type Result } from '#lib/practice/series.ts';
import { querySource, type Subscribe } from './sources.ts';
import { attemptsCol, exercisesCol, progressRef } from './refs.ts';
import type { AttemptMode, ConceptRecord, PracticeScore, WithId } from './types.ts';
import { inBackground } from './writes.ts';

// Practice (phase 2): the exercises a series draws from, and the record of a finished series.

type SheetRef = Pick<WithId<ConceptRecord>, 'id' | 'subjectId' | 'chapterId'>;

/** Active practice exercises of a sheet that the player can show (stored flat: id + fields). */
export function watchPlayableExercises(
	familyId: string,
	conceptId: string
): Subscribe<PlayableExercise[]> {
	const exercises = querySource(exercisesCol(familyId, conceptId));
	return (onData, onError) => exercises((docs) => onData(playable(docs)), onError);
}

export interface SeriesToSave {
	sheet: SheetRef;
	mode: AttemptMode;
	results: Result[];
	/** Best score so far (from the progress document), to keep the better one. */
	best: PracticeScore | null | undefined;
}

/**
 * Records a finished series in one batch: the attempt (history) and the scores on the progress
 * document. Not awaited: works offline like every child write.
 */
export function saveSeries(familyId: string, profileId: string, series: SeriesToSave): void {
	const { sheet, mode, results, best } = series;
	const score = scoreOf(results);
	if (score.total === 0) return;
	const batch = writeBatch(db);
	batch.set(doc(attemptsCol(familyId, profileId)), {
		conceptId: sheet.id,
		subjectId: sheet.subjectId,
		chapterId: sheet.chapterId,
		mode,
		...score,
		answers: results.map(({ exerciseId, correct }) => ({ exerciseId, correct })),
		createdAt: serverTimestamp()
	});
	batch.set(
		progressRef(familyId, profileId, sheet.id),
		{
			subjectId: sheet.subjectId,
			chapterId: sheet.chapterId,
			practiceLast: score,
			practiceBest: betterScore(best, score),
			practicedAt: serverTimestamp()
		},
		{ merge: true }
	);
	inBackground(batch.commit(), 'practice series');
}
