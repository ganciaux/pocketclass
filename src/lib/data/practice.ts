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
import { revisionEntryId, revisionOutcome, type RevisionProgress } from '#lib/practice/revision.ts';
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

/** Every finished run of a profile (series, challenges, assessments), for the statistics. */
export const watchAttempts = (familyId: string, profileId: string) =>
	querySource(attemptsCol(familyId, profileId));

export interface SeriesToSave {
	sheet: SheetRef & { keyPoints: unknown[] };
	results: Result[];
	/** The progress document: best score so far (to keep the better one) and the revision. */
	progress:
		| (RevisionProgress & { practiceBest?: PracticeScore; revisionPoints?: number })
		| null
		| undefined;
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

/** Adds a points line and the profile counter to a batch (the rules check them together). */
function earnPoints(
	batch: WriteBatch,
	familyId: string,
	profileId: string,
	entry: { id: string; kind: 'assessment' | 'revision'; sheet: SheetRef; amount: number }
): void {
	const { id, kind, sheet, amount } = entry;
	batch.set(pointsLedgerRef(familyId, profileId, id), {
		kind,
		conceptId: sheet.id,
		subjectId: sheet.subjectId,
		chapterId: sheet.chapterId,
		amount,
		createdAt: serverTimestamp()
	});
	batch.update(profileRef(familyId, profileId), { points: increment(amount), lastEarningId: id });
}

/**
 * A finished series: last score, best score (higher rate, then longer series). It also
 * unlocks a new assessment try after a fail, and on an acquired sheet earns the revision
 * points (at 70 %, once a week). Returns the revision points earned (0: none).
 */
export function saveSeries(familyId: string, profileId: string, series: SeriesToSave): number {
	const { sheet, results, progress } = series;
	const revision = revisionOutcome(scoreOf(results), progress, sheet.keyPoints.length, Date.now());
	saveAttempt(
		familyId,
		profileId,
		sheet,
		'series',
		results,
		(score) => ({
			practiceLast: score,
			practiceBest: betterScore(progress?.practiceBest, score),
			practicedAt: serverTimestamp(),
			retakeLocked: deleteField(),
			...(revision
				? {
						revisedAt: serverTimestamp(),
						revisionCount: revision.count,
						revisionPoints: (progress?.revisionPoints ?? 0) + revision.earned
					}
				: {})
		}),
		(batch) => {
			if (!revision) return;
			const id = revisionEntryId(sheet.id, revision.count);
			earnPoints(batch, familyId, profileId, {
				id,
				kind: 'revision',
				sheet,
				amount: revision.earned
			});
		}
	);
	return revision?.earned ?? 0;
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
			earnPoints(batch, familyId, profileId, {
				id: entryId,
				kind: 'assessment',
				sheet,
				amount: outcome.earned
			});
		}
	);
}
