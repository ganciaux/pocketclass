import { describe, expect, it } from 'vitest';
import { seeded } from '#lib/generators/random.ts';
import type { Exercise } from '#lib/schemas/common.ts';
import { canChallenge, challengeDraw } from './challenge.ts';
import { buildPracticeSeries, instantiate, isEmpty, practiceSet } from './generated.ts';

type Stored = Exercise & { archived?: boolean };

const written = (id: string, extra: Partial<Stored> = {}) =>
	({
		id,
		usage: 'practice',
		keyPoint: 'kp',
		difficulty: 1,
		type: 'mcq',
		question: 'Q',
		answer: 'A',
		distractors: ['B', 'C', 'D'],
		archived: false,
		...extra
	}) as Stored;

const generator = (id: string, name = 'units.length', extra: Partial<Stored> = {}) =>
	({
		id,
		usage: 'practice',
		keyPoint: 'kp',
		difficulty: 2,
		type: 'generator',
		generator: name,
		params: {},
		archived: false,
		...extra
	}) as Stored;

describe('practiceSet', () => {
	it('splits written exercises and known, active practice generators', () => {
		const set = practiceSet([
			written('a'),
			generator('g1'),
			generator('g2', 'nope.unknown'),
			generator('g3', 'units.mass', { archived: true }),
			generator('g4', 'units.mass', { usage: 'assessment' })
		]);
		expect(set.written.map((e) => e.id)).toEqual(['a']);
		expect(set.generators.map((e) => e.id)).toEqual(['g1']);
		expect(isEmpty(set)).toBe(false);
		expect(isEmpty(practiceSet([generator('g2', 'nope.unknown')]))).toBe(true);
	});
});

describe('instantiate', () => {
	it('makes a playable question that keeps the key point and names its generator', () => {
		const [gen] = practiceSet([generator('gen-km')]).generators;
		const question = instantiate(gen, 3, seeded(1));
		expect(question.id).toBe('gen-km~3');
		expect(question.type).toBe('calculation');
		expect(question).toMatchObject({ keyPoint: 'kp', usage: 'practice', difficulty: 2 });
		expect(question).not.toHaveProperty('generator');
		expect(question.explanation).toBeTruthy();
	});
});

describe('buildPracticeSeries', () => {
	it('puts the written exercises first, then fills up with generated questions in turn', () => {
		const set = practiceSet([
			written('a'),
			written('b'),
			generator('g1'),
			generator('g2', 'units.mass')
		]);
		const series = buildPracticeSeries(set, 10, seeded(2));
		expect(series).toHaveLength(10);
		expect(new Set(series.slice(0, 2).map((e) => e.id))).toEqual(new Set(['a', 'b']));
		const sources = series.slice(2).map((e) => e.id.split('~')[0]);
		expect(new Set(sources)).toEqual(new Set(['g1', 'g2']));
		expect(sources[0]).not.toBe(sources[1]);
		expect(new Set(series.map((e) => e.id)).size).toBe(10);
	});

	it('does not ask the same generated question twice when it can avoid it', () => {
		const set = practiceSet([generator('g1', 'powers.compute', { difficulty: 3 })]);
		for (let seed = 1; seed <= 20; seed++) {
			const texts = buildPracticeSeries(set, 6, seeded(seed)).map((e) =>
				e.type === 'calculation' ? e.statement : e.id
			);
			expect(new Set(texts).size).toBe(6);
		}
	});

	it('stays as before without generators', () => {
		const set = practiceSet([written('a'), written('b')]);
		expect(buildPracticeSeries(set, 10, seeded(3))).toHaveLength(2);
	});
});

describe('challenge with generators', () => {
	it('is possible with a single generator, and never runs out', () => {
		const set = practiceSet([generator('g1')]);
		expect(canChallenge(set)).toBe(true);
		expect(canChallenge(practiceSet([written('a')]))).toBe(false);
		const draw = challengeDraw(set, seeded(4));
		const ids = Array.from({ length: 20 }, () => draw()!.id);
		expect(new Set(ids).size).toBe(20);
		expect(ids[0]).toBe('g1~1');
	});

	it('mixes quick written exercises and generated questions', () => {
		const set = practiceSet([written('a'), written('b'), generator('g1')]);
		const draw = challengeDraw(set, seeded(5));
		const ids = Array.from({ length: 9 }, () => draw()!.id);
		expect(ids.filter((id) => id.startsWith('g1~'))).toHaveLength(3);
		expect(ids.filter((id) => id === 'a')).toHaveLength(3);
	});
});
