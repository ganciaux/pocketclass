import { describe, expect, it } from 'vitest';
import { practiceSet } from '#lib/practice/generated.ts';
import { storedGenerator, storedMcq } from '#lib/practice/testing.ts';
import { seeded } from '#lib/generators/random.ts';
import { drawMapTest, mapBranches } from './mindmap.ts';

const keyPoints = [
	{ id: 'kp-add', label: 'Additionner' },
	{ id: 'kp-mul', label: 'Multiplier' },
	{ id: 'kp-div', label: 'Diviser' }
];
const sections = [
	{ title: 'Même dénominateur', keyPoints: ['kp-add'] },
	{ title: 'Produit', keyPoints: ['kp-mul', 'kp-add'] },
	{ title: 'Inverse', keyPoints: ['kp-div'] }
];

describe('mapBranches', () => {
	it('numbers the key points and takes the leaves of the JSON mind map', () => {
		const mindMap = [{ keyPoint: 'kp-mul', leaves: ['haut × haut', 'bas × bas'] }];
		const branches = mapBranches({ keyPoints, sheet: { sections }, mindMap });
		expect(branches.map((b) => [b.number, b.label])).toEqual([
			[1, 'Additionner'],
			[2, 'Multiplier'],
			[3, 'Diviser']
		]);
		expect(branches[1].leaves).toEqual(['haut × haut', 'bas × bas']);
	});

	it('falls back on the titles of the sections about the key point', () => {
		const branches = mapBranches({ keyPoints, sheet: { sections } });
		expect(branches[0].leaves).toEqual(['Même dénominateur', 'Produit']);
		expect(branches[2].leaves).toEqual(['Inverse']);
	});
});

/** `n` written practice questions on a key point: `<kp>-1`, `<kp>-2`… */
const written = (keyPoint: string, n: number) =>
	Array.from({ length: n }, (_, i) => storedMcq(`${keyPoint}-${i + 1}`, { keyPoint }));
const ids = (test: { questions: { id: string }[] }) => test.questions.map((q) => q.id);

describe('drawMapTest', () => {
	const set = practiceSet([
		...written('kp-add', 6),
		...written('kp-mul', 3),
		...written('kp-div', 3)
	]);

	it('asks 3 questions on one branch, 5 spread over the whole map', () => {
		const branch = drawMapTest(set, [], 'kp-add', seeded(1));
		expect(branch.questions).toHaveLength(3);
		expect(branch.questions.every((q) => q.keyPoint === 'kp-add')).toBe(true);
		const whole = drawMapTest(set, [], null, seeded(2));
		expect(whole.questions).toHaveLength(5);
		expect(new Set(whole.questions.map((q) => q.keyPoint))).toEqual(
			new Set(['kp-add', 'kp-mul', 'kp-div'])
		);
	});

	it('never draws a question twice before all of them came out, then starts again', () => {
		const first = drawMapTest(set, [], 'kp-add', seeded(3));
		const second = drawMapTest(set, first.drawn, 'kp-add', seeded(4));
		expect(ids(second).some((id) => ids(first).includes(id))).toBe(false);
		expect([...first.drawn, ...ids(second)].sort()).toEqual([...second.drawn].sort());
		// All six are out: a new round starts, and remembers only its own questions.
		const third = drawMapTest(set, second.drawn, 'kp-add', seeded(5));
		expect(third.questions).toHaveLength(3);
		expect(third.drawn.filter((id) => id.startsWith('kp-add')).sort()).toEqual(ids(third).sort());
	});

	it('keeps what was drawn on the other branches', () => {
		const mul = drawMapTest(set, [], 'kp-mul', seeded(6));
		const add = drawMapTest(set, mul.drawn, 'kp-add', seeded(7));
		expect(add.drawn).toEqual(expect.arrayContaining(ids(mul)));
	});

	it('completes with generated questions when the branch has too few written ones', () => {
		const small = practiceSet([
			...written('kp-add', 1),
			storedGenerator('gen-add', { keyPoint: 'kp-add' }),
			storedGenerator('gen-mul', { keyPoint: 'kp-mul' })
		]);
		const test = drawMapTest(small, [], 'kp-add', seeded(8));
		expect(ids(test)).toHaveLength(3);
		expect(ids(test).filter((id) => id.startsWith('gen-add~'))).toHaveLength(2);
		expect(ids(test).some((id) => id.startsWith('gen-mul'))).toBe(false);
		expect(test.drawn).toEqual(['kp-add-1']);
	});

	it('forgets drawn ids that are no longer practice questions of the sheet', () => {
		const test = drawMapTest(set, ['gone-1', 'kp-mul-1'], 'kp-div', seeded(9));
		expect(test.drawn).not.toContain('gone-1');
		expect(test.drawn).toContain('kp-mul-1');
	});

	it('has nothing to ask on a branch without questions', () => {
		expect(drawMapTest(set, [], 'kp-none', seeded(10)).questions).toEqual([]);
	});
});
