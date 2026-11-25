import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '#lib/firebase.ts';
import { newRecord } from '#lib/practice/challenge.ts';
import { practiceSet, type PracticeSet } from '#lib/practice/generated.ts';
import { betterScore, scoreOf, type Result } from '#lib/practice/series.ts';
import { querySource, type Subscribe } from './sources.ts';
import { attemptsCol, exercisesCol, progressRef } from './refs.ts';
import type { AttemptMode, ConceptRecord, PracticeScore, WithId } from './types.ts';
import { inBackground } from './writes.ts';

// Practice (phase 2): the exercises a series draws from, and the record of a finished series.

type SheetRef = Pick<WithId<ConceptRecord>, 'id' | 'subjectId' | 'chapterId'>;

/** What a sheet offers to practise: written exercises and generators (stored flat: id + fields). */
export function watchPracticeSet(familyId: string, conceptId: string): Subscribe<PracticeSet> {
	const exercises = querySource(exercisesCol(familyId, conceptId));
	return (onData, onError) => exercises((docs) => onData(practiceSet(docs)), onError);
}

export interface SeriesToSave {
	sheet: SheetRef;
	results: Result[];
	/** Best score so far (from the progress document), to keep the better one. */
	best: PracticeScore | null | undefined;
}

/**
 * One batch: the attempt (history) and `fields` merged on the progress document. Not awaited:
 * works offline like every child write.
 */
function saveAttempt(
	familyId: string,
	profileId: string,
	sheet: SheetRef,
	mode: AttemptMode,
	results: Result[],
	fields: (score: PracticeScore) => Record<string, unknown>
): void {
	const score = scoreOf(results);
	if (score.total === 0) return;
	const where = { subjectId: sheet.subjectId, chapterId: sheet.chapterId };
	const batch = writeBatch(db);
	batch.set(doc(attemptsCol(familyId, profileId)), {
		conceptId: sheet.id,
		...where,
		mode,
		...score,
		answers: results.map(({ exerciseId, correct }) => ({ exerciseId, correct })),
		createdAt: serverTimestamp()
	});
	batch.set(
		progressRef(familyId, profileId, sheet.id),
		{ ...where, ...fields(score) },
		{ merge: true }
	);
	inBackground(batch.commit(), `practice ${mode}`);
}

/** A finished series: last score, best score (higher rate, then longer series). */
export function saveSeries(familyId: string, profileId: string, series: SeriesToSave): void {
	const { sheet, results, best } = series;
	saveAttempt(familyId, profileId, sheet, 'series', results, (score) => ({
		practiceLast: score,
		practiceBest: betterScore(best, score),
		practicedAt: serverTimestamp()
	}));
}

/** A finished timed challenge: the record is the highest number of right answers. */
export function saveChallenge(
	familyId: string,
	profileId: string,
	challenge: { sheet: SheetRef; results: Result[]; best: number | null | undefined }
): void {
	const { sheet, results, best } = challenge;
	saveAttempt(familyId, profileId, sheet, 'timed', results, (score) => ({
		challengeBest: newRecord(best, score.correct),
		challengedAt: serverTimestamp()
	}));
}
