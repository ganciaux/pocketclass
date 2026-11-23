import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { pathSchema, type PathDoc } from '#lib/schemas/path.ts';
import {
	chunk,
	findConceptConflicts,
	importStats,
	nextVersion,
	planImport,
	slugify,
	type ExistingState,
	type WriteOp
} from './importPlan.ts';

const sample: PathDoc = pathSchema.parse(
	JSON.parse(readFileSync('static/samples/maths-3e-brevet.json', 'utf8'))
);

const empty: ExistingState = {
	subjectExists: false,
	pathVersion: null,
	conceptIds: [],
	exerciseIds: {},
	assessmentIds: []
};

const key = (op: WriteOp) => `${op.kind} ${op.path.join('/')}`;

/** Simulates the state left in Firestore by a previous import of `path`. */
function stateAfter(path: PathDoc, version: number): ExistingState {
	return {
		subjectExists: true,
		pathVersion: version,
		conceptIds: path.concepts.map((c) => c.id),
		exerciseIds: Object.fromEntries(path.concepts.map((c) => [c.id, c.exercises.map((e) => e.id)])),
		assessmentIds: path.concepts.filter((c) => c.assessment).map((c) => c.id)
	};
}

describe('slugify', () => {
	it('removes accents and spaces', () => {
		expect(slugify('Mathématiques')).toBe('mathematiques');
		expect(slugify('  Histoire-Géo & EMC ')).toBe('histoire-geo-emc');
	});
});

describe('planImport', () => {
	it('creates subject, path, concepts, exercises and assessments on first import', () => {
		const plan = planImport(sample, empty, 'sample');
		const keys = plan.ops.map(key);

		expect(keys[0]).toBe('set subjects/mathematiques');
		expect(keys[1]).toBe('set paths/maths-3e-brevet');
		expect(keys).toContain('set concepts/maths-3e-fractions');
		expect(keys).toContain('set concepts/maths-3e-fractions/exercises/simplify-1');
		expect(keys).toContain('set assessments/maths-3e-fractions');
		expect(plan.ops.some((op) => op.kind === 'archive')).toBe(false);
		expect(plan.version).toBe(1);
		expect(plan.stats).toEqual({
			concepts: 3,
			exercises: 24,
			archivedConcepts: 0,
			archivedExercises: 0
		});
		// No duplicate document writes.
		expect(new Set(keys).size).toBe(keys.length);
	});

	it('maps JSON fields to the Firestore model', () => {
		const plan = planImport(sample, empty, 'paste');
		const find = (p: string) => plan.ops.find((op) => op.path.join('/') === p);

		const path = find('paths/maths-3e-brevet');
		expect(path?.kind === 'set' && path.data).toMatchObject({
			subjectId: 'mathematiques',
			type: 'brevet',
			source: 'paste',
			topics: [
				{ id: 'numbers', title: 'Nombres et calculs', order: 0 },
				{ id: 'geometry', title: 'Géométrie', order: 1 },
				{ id: 'functions', title: 'Fonctions', order: 2 }
			]
		});

		const concept = find('concepts/maths-3e-pythagoras');
		expect(concept?.kind === 'set' && concept.data).toMatchObject({
			pathId: 'maths-3e-brevet',
			topicId: 'geometry',
			order: 2,
			archived: false
		});

		const exercise = find('concepts/maths-3e-fractions/exercises/add-2');
		expect(exercise?.kind === 'set' && exercise.data).toEqual({
			usage: 'assessment',
			type: 'calculation',
			keyPoint: 'kp-add',
			difficulty: 2,
			statement: 'Calcule $\\frac{5}{12} + \\frac{1}{12}$.',
			answer: '1/2',
			requireIrreducible: true,
			archived: false
		});
		// Flat storage: `{ id, ...record }` is the original exercise again (no mapper needed).
		const original = sample.concepts[0].exercises.find((e) => e.id === 'add-2');
		const { archived: _archived, ...record } = exercise?.kind === 'set' ? exercise.data : {};
		expect({ id: 'add-2', ...record }).toEqual(original);

		const assessment = find('assessments/maths-3e-fractions');
		expect(assessment?.kind === 'set' && assessment.data).toMatchObject({
			pathId: 'maths-3e-brevet',
			conceptIds: ['maths-3e-fractions'],
			type: 'brevet',
			draw: { perKeyPoint: 2 },
			scoring: { pointsPerCorrect: 5, perfectBonus: 15 }
		});
	});

	it('re-import with version 2 and one exercise less archives it without duplicates', () => {
		const v2: PathDoc = structuredClone(sample);
		v2.version = 2;
		const fractions = v2.concepts[0];
		fractions.exercises = fractions.exercises.filter((e) => e.id !== 'add-1');

		const plan = planImport(v2, stateAfter(sample, 1), 'paste');
		const keys = plan.ops.map(key);

		expect(plan.version).toBe(2);
		expect(keys).toContain('archive concepts/maths-3e-fractions/exercises/add-1');
		expect(keys).not.toContain('set concepts/maths-3e-fractions/exercises/add-1');
		expect(keys).not.toContain('set subjects/mathematiques');
		expect(plan.stats.archivedExercises).toBe(1);
		expect(new Set(keys).size).toBe(keys.length);
	});

	it('archives removed concepts and their assessment; bumps the version even if unchanged', () => {
		const v1bis: PathDoc = structuredClone(sample);
		v1bis.concepts = v1bis.concepts.filter((c) => c.id !== 'maths-3e-fractions');

		const plan = planImport(v1bis, stateAfter(sample, 3), 'paste');
		const keys = plan.ops.map(key);

		expect(plan.version).toBe(4);
		expect(keys).toContain('archive concepts/maths-3e-fractions');
		expect(keys).toContain('archive assessments/maths-3e-fractions');
		expect(plan.stats.archivedConcepts).toBe(1);
	});
});

describe('nextVersion', () => {
	it('never goes backwards and always increases on re-import', () => {
		expect(nextVersion(1, null)).toBe(1);
		expect(nextVersion(3, null)).toBe(3);
		expect(nextVersion(1, 1)).toBe(2);
		expect(nextVersion(5, 2)).toBe(5);
		expect(nextVersion(2, 7)).toBe(8);
	});
});

describe('findConceptConflicts', () => {
	it('reports concept ids owned by another path only', () => {
		expect(
			findConceptConflicts(sample, {
				'maths-3e-fractions': 'maths-3e-brevet', // same path: re-import, fine
				'maths-3e-powers': 'maths-4e-test' // another path: conflict
			})
		).toEqual([{ conceptId: 'maths-3e-powers', ownerPathId: 'maths-4e-test' }]);
		expect(findConceptConflicts(sample, {})).toEqual([]);
	});

	it('marks the path write with touch (server updatedAt)', () => {
		const plan = planImport(sample, empty, 'paste');
		const touched = plan.ops.filter((op) => op.kind === 'set' && op.touch).map(key);
		expect(touched).toEqual(['set paths/maths-3e-brevet']);
	});
});

describe('importStats', () => {
	it('counts key points and exercises by usage', () => {
		expect(importStats(sample.concepts[0])).toEqual({ keyPoints: 5, practice: 6, assessment: 10 });
	});
});

describe('chunk', () => {
	it('splits into batches of at most n items', () => {
		const items = Array.from({ length: 1000 }, (_, i) => i);
		const chunks = chunk(items, 450);
		expect(chunks.map((c) => c.length)).toEqual([450, 450, 100]);
		expect(chunks.flat()).toEqual(items);
	});
});
