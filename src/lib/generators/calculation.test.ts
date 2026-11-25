import { describe, expect, it } from 'vitest';
import {
	add,
	divide,
	equals,
	fraction,
	isIrreducible,
	multiply,
	parseFraction,
	subtract,
	type Fraction
} from '#lib/math/fraction.ts';
import { generatorById } from './catalog.ts';
import { seeded } from './random.ts';
import type { Difficulty, Generated } from './types.ts';

/** Many draws of one generator, all difficulties. */
function draws(id: string, n = 200): { generated: Generated; difficulty: Difficulty }[] {
	const generator = generatorById(id)!;
	const random = seeded(42);
	return ([1, 2, 3] as Difficulty[]).flatMap((difficulty) =>
		Array.from({ length: n }, () => ({
			generated: generator.generate(random, { difficulty, params: {} }),
			difficulty
		}))
	);
}

/** The fractions written in a KaTeX formula: `-\frac{3}{4}`, `\frac{1}{2}`, integers alone. */
function fractionsIn(formula: string): Fraction[] {
	return [...formula.matchAll(/(-?)\\frac\{(\d+)\}\{(\d+)\}|(?<![\d{])(-?\d+)(?![\d}])/g)].map(
		(m) =>
			m[4] !== undefined
				? fraction(Number(m[4]))
				: fraction(Number(m[2]) * (m[1] ? -1 : 1), Number(m[3]))
	);
}

const lastFormula = (text: string) => [...text.matchAll(/\$([^$]+)\$/g)].at(-1)![1];
const answerOf = (g: Generated) => parseFraction((g as { answer: string }).answer)!;

describe('fraction generators', () => {
	it('simplify: the answer is the written fraction, irreducible', () => {
		for (const { generated } of draws('fractions.simplify')) {
			const [written] = fractionsIn(lastFormula((generated as { statement: string }).statement));
			expect(equals(answerOf(generated), written)).toBe(true);
			expect(isIrreducible(answerOf(generated))).toBe(true);
		}
	});

	it.each([
		[
			'fractions.add',
			(a: Fraction, b: Fraction, op: string) => (op === '+' ? add(a, b) : subtract(a, b))
		],
		['fractions.multiply', (a: Fraction, b: Fraction) => multiply(a, b)],
		['fractions.divide', (a: Fraction, b: Fraction) => divide(a, b)]
	] as const)('%s: the answer is the computed value, irreducible', (id, compute) => {
		for (const { generated } of draws(id)) {
			const formula = lastFormula((generated as { statement: string }).statement);
			const [a, b] = fractionsIn(formula.replace(/\\left\(|\\right\)/g, ''));
			const op = formula.includes(' - ') ? '-' : '+';
			const expected = compute(a, b, op);
			expect(equals(answerOf(generated), expected)).toBe(true);
			expect(isIrreducible(answerOf(generated))).toBe(true);
		}
	});

	it('compare: true exactly when the shown sign is right', () => {
		for (const { generated } of draws('fractions.compare')) {
			const statement = (generated as { statement: string }).statement;
			const [a, b] = fractionsIn(statement);
			const less = a.num * b.den < b.num * a.den;
			expect(generated.answer).toBe(statement.includes('<') === less);
		}
	});
});

describe('powers and numbers', () => {
	it('scientific: the decimal writing has the value of a × 10ⁿ', () => {
		for (const { generated } of draws('powers.scientific')) {
			if (generated.type !== 'calculation') continue;
			const m = /\$(.+?) \\times 10\^\{(-?\d+)\}\$/.exec(generated.statement)!;
			const mantissa = Number(m[1].replace('{,}', '.'));
			const value = Number(generated.answer.replace(',', '.'));
			const expected = mantissa * 10 ** Number(m[2]);
			expect(Math.abs(value - expected) / expected).toBeLessThan(1e-12);
		}
	});

	it('priority: the answer is the value of the expression', () => {
		for (const { generated } of draws('numbers.priority')) {
			const formula = lastFormula((generated as { statement: string }).statement);
			const js = formula
				.replace(/\\times/g, '*')
				.replace(/\\div/g, '/')
				.replace(/\^\{(\d+)\}/g, '**$1');
			const value = Function(`return ${js}`)() as number;
			expect(Number(generated.answer)).toBe(value);
		}
	});

	it('percent: a share, a new price or a rate that matches the numbers', () => {
		for (const { generated, difficulty } of draws('percent.apply')) {
			const numbers = [
				...(generated as { statement: string }).statement.matchAll(/\$(\d+)(?:\\,\\%)?\$/g)
			].map((m) => Number(m[1]));
			const answer = Number((generated as { answer: string }).answer);
			const up = (generated as { statement: string }).statement.includes('augment');
			if (difficulty === 1) expect(answer).toBe((numbers[0] * numbers[1]) / 100);
			if (difficulty === 2)
				expect(answer).toBeCloseTo(numbers[0] * (1 + ((up ? 1 : -1) * numbers[1]) / 100));
			if (difficulty === 3)
				expect(numbers[1]).toBeCloseTo(numbers[0] * (1 + ((up ? 1 : -1) * answer) / 100));
		}
	});
});
