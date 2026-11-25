import {
	deleteField,
	doc,
	increment,
	serverTimestamp,
	writeBatch,
	type WriteBatch
} from 'firebase/firestore';
import { db } from '#lib/firebase.ts';
import {
	assessmentOutcome,
	type AssessmentProgress,
	type AssessmentSettings
} from '#lib/practice/assessment.ts';
import { newRecord } from '#lib/practice/challenge.ts';
import { practiceSet, type PracticeSet } from '#lib/practice/generated.ts';
import { betterScore, scoreOf, type Result } from '#lib/practice/series.ts';
import { combine, docSource, querySource, type Subscribe } from './sources.ts';
import {
	assessmentRef,
	attemptsCol,
	exercisesCol,
	pointsLedgerRef,
	profileRef,
	progressRef
} from './refs.ts';
import type {
	AssessmentRecord,
	AttemptMode,
	ConceptRecord,
	ExerciseRecord,
	PracticeScore,
	WithId
} from './types.ts';
import { inBackground } from './writes.ts';

// Practice (phase 2) and assessment (phase 3): what a sheet draws from, and the record of a
// finished series, challenge or assessment.

type SheetRef = Pick<WithId<ConceptRecord>, 'id' | 'subjectId' | 'chapterId'>;

/** What a sheet offers to practise: written exercises and generators (stored flat: id + fields). */
export function watchPracticeSet(familyId: string, conceptId: string): Subscribe<PracticeSet> {
	const exercises = querySource(exercisesCol(familyId, conceptId));
	return (onData, onError) => exercises((docs) => onData(practiceSet(docs)), onError);
}

/** A sheet's assessment document (null: sheet imported before assessments). */
export const watchAssessment = (familyId: string, conceptId: string) =>
	docSource(assessmentRef(familyId, conceptId));

/** What an assessment needs: its document (null: sheet imported before) and the exercises. */
export function watchAssessmentSetup(
	familyId: string,
	conceptId: string
): Subscribe<{ assessment: WithId<AssessmentRecord> | null; exercises: WithId<ExerciseRecord>[] }> {
	return combine({
		assessment: docSource(assessmentRef(familyId, conceptId)),
		exercises: querySource(exercisesCol(familyId, conceptId))
	});
}

export interface SeriesToSave {
	sheet: SheetRef;
	results: Result[];
	/** Best score so far (from the progress document), to keep the better one. */
	best: PracticeScore | null | undefined;
}

/**
 * One batch: the attempt (history), `fields` merged on the progress document and the `extra`
 * writes. Not awaited: works offline like every child write.
 */
function saveAttempt(
	familyId: string,
	profileId: string,
	sheet: SheetRef,
	mode: AttemptMode,
	results: Result[],
	fields: (score: PracticeScore) => Record<string, unknown>,
	extra?: (batch: WriteBatch, score: PracticeScore) => void
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
	extra?.(batch, score);
	inBackground(batch.commit(), `practice ${mode}`);
}

/**
 * A finished series: last score, best score (higher rate, then longer series). It also
 * unlocks a new assessment try after a fail.
 */
export function saveSeries(familyId: string, profileId: string, series: SeriesToSave): void {
	const { sheet, results, best } = series;
	saveAttempt(familyId, profileId, sheet, 'series', results, (score) => ({
		practiceLast: score,
		practiceBest: betterScore(best, score),
		practicedAt: serverTimestamp(),
		retakeLocked: deleteField()
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

/**
 * A finished assessment: scores, then the stamps (« Acquise » at the first pass, « Raté » and
 * the lock after a fail while not acquired) and, at the first pass, the points line and the
 * profile counter, in the same batch (the rules check them together).
 */
export function saveAssessment(
	familyId: string,
	profileId: string,
	assessment: {
		sheet: SheetRef;
		results: Result[];
		settings: AssessmentSettings;
		progress: (AssessmentProgress & { assessmentBest?: PracticeScore }) | null | undefined;
	}
): void {
	const { sheet, results, settings, progress } = assessment;
	const outcome = assessmentOutcome(scoreOf(results), settings, progress);
	const entryId = `assessment-${sheet.id}`;
	saveAttempt(
		familyId,
		profileId,
		sheet,
		'assessment',
		results,
		(score) => ({
			assessmentLast: score,
			assessmentBest: betterScore(progress?.assessmentBest, score),
			assessedAt: serverTimestamp(),
			...(outcome.stampAcquired ? { acquiredAt: serverTimestamp() } : {}),
			...(outcome.pass ? { failedAt: deleteField(), retakeLocked: deleteField() } : {}),
			...(outcome.stampFailed ? { failedAt: serverTimestamp(), retakeLocked: true } : {}),
			...(outcome.firstPass ? { assessmentPoints: outcome.earned } : {})
		}),
		(batch) => {
			if (!outcome.firstPass) return;
			batch.set(pointsLedgerRef(familyId, profileId, entryId), {
				kind: 'assessment',
				conceptId: sheet.id,
				subjectId: sheet.subjectId,
				chapterId: sheet.chapterId,
				amount: outcome.earned,
				createdAt: serverTimestamp()
			});
			batch.update(profileRef(familyId, profileId), {
				points: increment(outcome.earned),
				lastEarningId: entryId
			});
		}
	);
}
