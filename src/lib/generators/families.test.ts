import { describe, expect, it } from 'vitest';
import { parseFraction } from '#lib/math/fraction.ts';
import { generatorById } from './catalog.ts';
import { seeded } from './random.ts';
import type { Difficulty, Generated } from './types.ts';
import { TABLES } from './units.ts';

function draws(id: string, params: Record<string, unknown> = {}, n = 200) {
	const generator = generatorById(id)!;
	const random = seeded(7);
	return ([1, 2, 3] as Difficulty[]).flatMap((difficulty) =>
		Array.from({ length: n }, () => generator.generate(random, { difficulty, params }))
	);
}

const statementOf = (g: Generated) => (g.type === 'mcq' ? g.question : g.statement);
const value = (text: string) => {
	// KaTeX thousands space (`\,`) out, tight comma (`{,}`) back to a comma.
	const f = parseFraction(text.replaceAll('\\,', '').replace('{,}', ','))!;
	return f.num / f.den;
};

/** Value of a linear expression in KaTeX ("-3x + 5") for x. */
const evaluate = (expression: string, x: number) =>
	Function('x', `return ${expression.replace(/(\d)x/g, '$1*x')}`)(x) as number;

describe('equations', () => {
	it.each(['equations.linear', 'equations.both_sides'])('%s: the answer solves it', (id) => {
		for (const g of draws(id)) {
			const [left, right] = /\$(.+?) = (.+?)\$/.exec(statementOf(g))!.slice(1);
			const x = value((g as { answer: string }).answer);
			expect(evaluate(left, x)).toBeCloseTo(evaluate(right, x), 9);
		}
	});
});

describe('conversions', () => {
	it.each(Object.keys(TABLES) as (keyof typeof TABLES)[])(
		'units.%s: the comma moves by the right power',
		(name) => {
			const table: Record<string, number> = TABLES[name];
			for (const g of draws(`units.${name}`)) {
				const [, v, from, to] = /^Convertis \$(.+?)\$ (\S+) en (\S+)\.$/.exec(statementOf(g))!;
				const expected = value(v) * 10 ** (table[from] - table[to]);
				const answer = value((g as { answer: string }).answer);
				expect(Math.abs(answer - expected) / expected).toBeLessThan(1e-12);
			}
		}
	);

	it('keeps to the units given in params', () => {
		for (const g of draws('units.length', { units: ['km', 'm'] })) {
			expect(statementOf(g)).toMatch(/\$ (km en m|m en km)\.$/);
		}
		// Fewer than 2 known units: the param is ignored.
		const units = new Set(
			draws('units.length', { units: ['km', 'parsec'] }).map((g) =>
				statementOf(g).split(' ').at(-1)
			)
		);
		expect(units.size).toBeGreaterThan(2);
		// Units of the same size give no conversion: the param is ignored too (no crash).
		for (const [id, same] of [
			['units.volume', ['dm³', 'L']],
			['units.area', ['ha', 'hm²']]
		] as const) {
			expect(() => draws(id, { units: [...same] }, 20)).not.toThrow();
		}
	});

	it('duration: the true / false trap is true only with the right minutes', () => {
		for (const g of draws('units.duration')) {
			if (g.type !== 'true_false') continue;
			const [, hours, h, m] = /^\$(.+?)\$ h \$=\$ \$(\d+)\$ h \$(\d+)\$ min$/.exec(g.statement)!;
			expect(g.answer).toBe(Math.abs(value(hours) * 60 - (Number(h) * 60 + Number(m))) < 1e-9);
		}
	});
});

describe('geometry', () => {
	it('pythagoras: the found side fits the theorem (rounded to the tenth)', () => {
		for (const g of draws('geometry.pythagoras')) {
			if (g.type !== 'calculation') continue;
			const sides = Object.fromEntries(
				[...g.statement.matchAll(/\$(\w\w) = (\d+)\$/g)].map((m) => [m[1], Number(m[2])])
			);
			const found = value(g.answer);
			const [ab, other] = [sides.AB, sides.AC ?? sides.BC];
			const exact = sides.BC ? Math.sqrt(sides.BC ** 2 - ab ** 2) : Math.sqrt(ab ** 2 + other ** 2);
			expect(Math.abs(found - exact)).toBeLessThanOrEqual(0.05 + 1e-9);
			expect(g.statement.includes('arrondi')).toBe(!Number.isInteger(exact));
		}
	});

	it('keeps to the shapes given in params', () => {
		for (const g of draws('geometry.area', { shapes: ['disc'] })) {
			expect(statementOf(g)).toMatch(/^Un disque/);
		}
	});
});
