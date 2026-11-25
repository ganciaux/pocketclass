import { generatorById } from '#lib/generators/catalog.ts';
import type { Exercise } from '#lib/schemas/common.ts';
import type { PlayableExercise } from './answers.ts';
import { generatedDraw, type GeneratorExercise } from './generated.ts';
import { shuffle, type Random, type Score } from './series.ts';

/**
 * The sheet's assessment (« Contrôle », phase 3): which questions, when it is passed, what it
 * stamps and earns. Pure module (unit-tested).
 */

export const DEFAULT_PASS_RATE = 70;
export const POINTS_PER_KEY_POINT = 10;
export const DEFAULT_PER_KEY_POINT = 2;
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

type Stored = Exercise & { archived?: boolean };

/** What an assessment draws from; `exerciseIds` (from the JSON) limits the written ones. */
export function assessmentPool(exercises: Stored[], exerciseIds?: string[]): AssessmentPool {
	const active = exercises.filter((e) => !e.archived);
	const chosen = exerciseIds && exerciseIds.length > 0 ? new Set(exerciseIds) : null;
	return {
		written: active.filter(
			(e): e is Exclude<Stored, { type: 'generator' }> =>
				e.type !== 'generator' &&
				e.usage === 'assessment' &&
				!SELF_ASSESSED.has(e.type) &&
				(!chosen || chosen.has(e.id))
		),
		generators: active.filter(
			(e): e is GeneratorExercise & { archived?: boolean } =>
				e.type === 'generator' && generatorById(e.generator) !== undefined
		)
	};
}

/**
 * `perKeyPoint` questions per key point: generated ones when the key point has a generator
 * (new at each try, no text twice), else written ones. Key points without questions are
 * skipped; the questions come shuffled.
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
		const generators = shuffle(
			pool.generators.filter((g) => g.keyPoint === keyPoint),
			random
		);
		if (generators.length > 0) {
			for (let i = 0; i < perKeyPoint; i++) {
				questions.push(draw(generators[i % generators.length], seen));
			}
			continue;
		}
		const written = shuffle(
			pool.written.filter((e) => e.keyPoint === keyPoint),
			random
		);
		questions.push(...written.slice(0, perKeyPoint));
	}
	return shuffle(questions, random);
}

/** How many questions `buildAssessment` makes (announced before starting). */
export function assessmentSize(
	pool: AssessmentPool,
	keyPoints: string[],
	perKeyPoint = DEFAULT_PER_KEY_POINT
): number {
	return keyPoints.reduce((total, keyPoint) => {
		if (pool.generators.some((g) => g.keyPoint === keyPoint)) return total + perKeyPoint;
		return (
			total + Math.min(perKeyPoint, pool.written.filter((e) => e.keyPoint === keyPoint).length)
		);
	}, 0);
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

export function assessmentStatus(progress: AssessmentProgress | null | undefined) {
	const acquired = progress?.acquiredAt !== undefined;
	return {
		acquired,
		/** The « Raté » stamp: failed and not acquired since. */
		failed: !acquired && progress?.failedAt !== undefined,
		/** A new try waits for a finished practice series. */
		locked: !acquired && progress?.retakeLocked === true,
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
