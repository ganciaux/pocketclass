import type { PlayableExercise } from './answers.ts';
import {
	generatedDraw,
	knownGenerators,
	type GeneratorExercise,
	type StoredExercise
} from './generated.ts';
import { shuffle, type Random, type Score } from './series.ts';

/**
 * The sheet's assessment (« Contrôle », phase 3): which questions, when it is passed, what it
 * stamps and earns. Pure module (unit-tested).
 */

export const DEFAULT_PASS_RATE = 70;
export const POINTS_PER_KEY_POINT = 10;
export const DEFAULT_PER_KEY_POINT = 2;
/** The rules accept at most 100 answers per attempt. */
export const MAX_ASSESSMENT_QUESTIONS = 100;
/** Self-assessed types: an assessment is marked by the app. */
const SELF_ASSESSED = new Set(['pair', 'paper']);

export interface AssessmentSettings {
	/** Minimum success rate, in %. */
	passRate: number;
	/** Points earned by the first pass. */
	points: number;
}

/** The parent's settings, or the defaults (70 %, 10 points per key point). */
export function settingsOf(
	assessment: { passRate?: number; points?: number } | null | undefined,
	keyPointCount: number
): AssessmentSettings {
	return {
		passRate: assessment?.passRate ?? DEFAULT_PASS_RATE,
		points: assessment?.points ?? POINTS_PER_KEY_POINT * keyPointCount
	};
}

export interface AssessmentPool {
	/** Written assessment exercises the app can mark. */
	written: PlayableExercise[];
	/** Every known generator of the sheet: its questions are new at each try. */
	generators: GeneratorExercise[];
}

/** What an assessment draws from; `exerciseIds` (from the JSON) limits the written ones. */
export function assessmentPool(
	exercises: StoredExercise[],
	exerciseIds?: string[]
): AssessmentPool {
	const chosen = exerciseIds && exerciseIds.length > 0 ? new Set(exerciseIds) : null;
	return {
		written: exercises.filter(
			(e): e is Exclude<StoredExercise, { type: 'generator' }> =>
				e.type !== 'generator' &&
				!e.archived &&
				e.usage === 'assessment' &&
				!SELF_ASSESSED.has(e.type) &&
				(!chosen || chosen.has(e.id))
		),
		// Any usage: a practice generator still makes new questions for the assessment.
		generators: knownGenerators(exercises)
	};
}

/** One key point's share: its generators, else its written exercises, and how many questions. */
function keyPointShare(pool: AssessmentPool, keyPoint: string, perKeyPoint: number) {
	const generators = pool.generators.filter((g) => g.keyPoint === keyPoint);
	const written = pool.written.filter((e) => e.keyPoint === keyPoint);
	const count = generators.length > 0 ? perKeyPoint : Math.min(perKeyPoint, written.length);
	return { generators, written, count };
}

/**
 * `perKeyPoint` questions per key point: generated ones when the key point has a generator
 * (new at each try, no text twice), else written ones. Key points without questions are
 * skipped; at most `MAX_ASSESSMENT_QUESTIONS`; the questions come shuffled.
 */
export function buildAssessment(
	pool: AssessmentPool,
	keyPoints: string[],
	perKeyPoint = DEFAULT_PER_KEY_POINT,
	random: Random = Math.random
): PlayableExercise[] {
	const draw = generatedDraw(random);
	const seen = new Set<string>();
	const questions: PlayableExercise[] = [];
	for (const keyPoint of keyPoints) {
		const share = keyPointShare(pool, keyPoint, perKeyPoint);
		const count = Math.min(share.count, MAX_ASSESSMENT_QUESTIONS - questions.length);
		if (share.generators.length > 0) {
			const generators = shuffle(share.generators, random);
			for (let i = 0; i < count; i++) questions.push(draw(generators[i % generators.length], seen));
		} else {
			questions.push(...shuffle(share.written, random).slice(0, count));
		}
	}
	return shuffle(questions, random);
}

/** How many questions `buildAssessment` makes (announced before starting). */
export function assessmentSize(
	pool: AssessmentPool,
	keyPoints: string[],
	perKeyPoint = DEFAULT_PER_KEY_POINT
): number {
	const total = keyPoints.reduce(
		(sum, keyPoint) => sum + keyPointShare(pool, keyPoint, perKeyPoint).count,
		0
	);
	return Math.min(total, MAX_ASSESSMENT_QUESTIONS);
}

export const passed = (score: Score, passRate: number) =>
	score.total > 0 && score.correct * 100 >= passRate * score.total;

/** What the assessment fields of a progress document say (null times = pending writes). */
export interface AssessmentProgress {
	acquiredAt?: unknown;
	failedAt?: unknown;
	retakeLocked?: boolean;
	/** Points already earned by this sheet's assessment (absent: none yet). */
	assessmentPoints?: number;
	assessmentBest?: Score;
}

/**
 * What the sheet page and the assessment page show. `canPractise` false (a sheet without
 * practice): a fail never locks, as no series could unlock it.
 */
export function assessmentStatus(
	progress: AssessmentProgress | null | undefined,
	canPractise = true
) {
	const acquired = progress?.acquiredAt !== undefined;
	return {
		acquired,
		/** The « Raté » stamp: failed and not acquired since. */
		failed: !acquired && progress?.failedAt !== undefined,
		/** A new try waits for a finished practice series. */
		locked: !acquired && canPractise && progress?.retakeLocked === true,
		best: progress?.assessmentBest ?? null
	};
}

/** What a finished assessment does: stamps, lock and the points it earns (once per sheet). */
export function assessmentOutcome(
	score: Score,
	settings: AssessmentSettings,
	progress: AssessmentProgress | null | undefined
) {
	const pass = passed(score, settings.passRate);
	const { acquired } = assessmentStatus(progress);
	const firstPass = pass && progress?.assessmentPoints === undefined;
	return {
		pass,
		/** The points are earned now (recorded even when the amount is 0). */
		firstPass,
		/** Stamp « Acquise » now (first pass, unless the parent stamped it before). */
		stampAcquired: pass && !acquired,
		/** Stamp « Raté » and lock a new try (only while not acquired). */
		stampFailed: !pass && !acquired,
		earned: firstPass ? settings.points : 0
	};
}

/** Points earned by assessments, per subject id (summed from the progress documents). */
export function pointsBySubject(
	progress: Iterable<{ subjectId: string; assessmentPoints?: number }>
): Map<string, number> {
	const points = new Map<string, number>();
	for (const { subjectId, assessmentPoints } of progress) {
		if (assessmentPoints) points.set(subjectId, (points.get(subjectId) ?? 0) + assessmentPoints);
	}
	return points;
}
