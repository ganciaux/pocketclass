import { describe, expect, it } from 'vitest';
import { seeded } from '#lib/generators/random.ts';
import type { StoredExercise } from './generated.ts';
import { correctionOf, exercisePrompt, type PlayableExercise } from './answers.ts';
import {
	assessmentOutcome,
	assessmentPool,
	assessmentSize,
	assessmentStatus,
	buildAssessment,
	passed,
	pointsBySubject,
	settingsOf
} from './assessment.ts';
import { storedGenerator, storedMcq } from './testing.ts';

const mcq = (id: string, keyPoint: string, extra: Partial<StoredExercise> = {}) =>
	storedMcq(id, { usage: 'assessment', keyPoint, ...extra });
const gen = (id: string, keyPoint: string, extra: Partial<StoredExercise> = {}) =>
	storedGenerator(id, { keyPoint, ...extra });

describe('settingsOf', () => {
	it('uses the parent settings, else 70 % and 10 points per key point', () => {
		expect(settingsOf(null, 4)).toEqual({ passRate: 70, points: 40 });
		expect(settingsOf({ passRate: 80 }, 4)).toEqual({ passRate: 80, points: 40 });
		expect(settingsOf({ points: 0 }, 4)).toEqual({ passRate: 70, points: 0 });
	});
});

describe('assessmentPool', () => {
	it('keeps written assessment exercises the app can mark, and every known generator', () => {
		const pool = assessmentPool([
			mcq('a', 'kp1'),
			mcq('b', 'kp1', { usage: 'practice' }),
			mcq('c', 'kp1', { archived: true }),
			{ ...mcq('d', 'kp1'), type: 'paper', instruction: 'Fais' } as StoredExercise,
			gen('g1', 'kp1'),
			gen('g2', 'kp1', { generator: 'nope' }),
			gen('g3', 'kp2', { usage: 'assessment' })
		]);
		expect(pool.written.map((e) => e.id)).toEqual(['a']);
		expect(pool.generators.map((e) => e.id)).toEqual(['g1', 'g3']);
	});

	it('limits the written exercises to exerciseIds when given', () => {
		const pool = assessmentPool([mcq('a', 'kp1'), mcq('b', 'kp1')], ['b']);
		expect(pool.written.map((e) => e.id)).toEqual(['b']);
	});
});

describe('buildAssessment', () => {
	it('generates when a key point has a generator, else takes written exercises', () => {
		const pool = assessmentPool([
			mcq('a', 'kp1'),
			mcq('b', 'kp1'),
			mcq('c', 'kp1'),
			mcq('x', 'kp2'),
			gen('g', 'kp2'),
			mcq('lonely', 'kp3')
		]);
		const questions = buildAssessment(pool, ['kp1', 'kp2', 'kp3', 'kp4'], 2, seeded(1));
		const ids = questions.map((q) => q.id);
		expect(ids).toHaveLength(5);
		expect(ids.filter((id) => ['a', 'b', 'c'].includes(id))).toHaveLength(2);
		expect(ids.filter((id) => id.startsWith('g~'))).toHaveLength(2);
		expect(ids).not.toContain('x');
		expect(ids).toContain('lonely');
		expect(assessmentSize(pool, ['kp1', 'kp2', 'kp3', 'kp4'], 2)).toBe(5);
	});

	it('makes different generated questions at each try', () => {
		const pool = assessmentPool([gen('g', 'kp1')]);
		const text = (seed: number) =>
			buildAssessment(pool, ['kp1'], 3, seeded(seed)).map((q) => exercisePrompt(q));
		expect(new Set(text(1)).size).toBe(3);
		expect(text(1)).not.toEqual(text(2));
	});
});

describe('passing, stamps and points', () => {
	const settings = { passRate: 70, points: 40 };

	it('passes from the threshold up', () => {
		expect(passed({ correct: 7, total: 10 }, 70)).toBe(true);
		expect(passed({ correct: 6, total: 10 }, 70)).toBe(false);
		expect(passed({ correct: 2, total: 3 }, 70)).toBe(false);
		expect(passed({ correct: 0, total: 0 }, 0)).toBe(false);
	});

	it('first pass: stamps « Acquise » and earns the points', () => {
		expect(assessmentOutcome({ correct: 8, total: 10 }, settings, null)).toEqual({
			pass: true,
			firstPass: true,
			stampAcquired: true,
			stampFailed: false,
			earned: 40
		});
	});

	it('a later pass earns nothing more; a parent stamp is kept', () => {
		const done = { acquiredAt: 1, assessmentPoints: 40 };
		expect(assessmentOutcome({ correct: 10, total: 10 }, settings, done)).toMatchObject({
			firstPass: false,
			stampAcquired: false,
			earned: 0
		});
		const stampedByParent = { acquiredAt: 1 };
		expect(assessmentOutcome({ correct: 9, total: 10 }, settings, stampedByParent)).toMatchObject({
			stampAcquired: false,
			earned: 40
		});
	});

	it('a fail stamps « Raté » only while not acquired', () => {
		expect(assessmentOutcome({ correct: 2, total: 10 }, settings, null).stampFailed).toBe(true);
		expect(
			assessmentOutcome({ correct: 2, total: 10 }, settings, { acquiredAt: null }).stampFailed
		).toBe(false);
	});

	it('reads the status: acquired (even pending), failed, locked', () => {
		expect(assessmentStatus(null)).toEqual({
			acquired: false,
			failed: false,
			locked: false,
			best: null
		});
		expect(assessmentStatus({ failedAt: 1, retakeLocked: true })).toMatchObject({
			failed: true,
			locked: true
		});
		expect(assessmentStatus({ acquiredAt: null, failedAt: 1, retakeLocked: true })).toMatchObject({
			acquired: true,
			failed: false,
			locked: false
		});
	});
});

describe('correctionOf', () => {
	it('names the right choice, which no button shows in a correction list', () => {
		const choice = mcq('a', 'kp') as PlayableExercise;
		expect(correctionOf(choice)).toEqual(['A']);
		const tf = { ...choice, type: 'true_false', statement: 'S', answer: false } as PlayableExercise;
		expect(correctionOf(tf)).toEqual(['Faux']);
	});
});

describe('review fixes', () => {
	it('never draws more than 100 questions (the rules refuse a longer attempt)', () => {
		const pool = assessmentPool([gen('g1', 'kp1'), gen('g2', 'kp2')]);
		expect(buildAssessment(pool, ['kp1', 'kp2'], 60, seeded(3))).toHaveLength(100);
		expect(assessmentSize(pool, ['kp1', 'kp2'], 60)).toBe(100);
	});

	it('a fail does not lock a sheet that has nothing to practise', () => {
		const failed = { failedAt: 1, retakeLocked: true };
		expect(assessmentStatus(failed, false)).toMatchObject({ failed: true, locked: false });
		expect(assessmentStatus(failed, true).locked).toBe(true);
	});
});

describe('pointsBySubject', () => {
	it('adds the points earned per subject', () => {
		const points = pointsBySubject([
			{ subjectId: 'maths', assessmentPoints: 30 },
			{ subjectId: 'maths', assessmentPoints: 20 },
			{ subjectId: 'maths' },
			{ subjectId: 'fr', assessmentPoints: 0 },
			{ subjectId: 'fr', assessmentPoints: 10 }
		]);
		expect(Object.fromEntries(points)).toEqual({ maths: 50, fr: 10 });
	});

	it('adds the revision points too', () => {
		const points = pointsBySubject([
			{ subjectId: 'maths', assessmentPoints: 30, revisionPoints: 12 },
			{ subjectId: 'fr', revisionPoints: 4 }
		]);
		expect(Object.fromEntries(points)).toEqual({ maths: 42, fr: 4 });
	});
});
