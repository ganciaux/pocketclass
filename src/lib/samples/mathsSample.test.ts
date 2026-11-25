import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
	add,
	divide,
	equals,
	fraction,
	isIrreducible,
	multiply,
	parseFraction,
	power,
	subtract,
	toString,
	type Fraction
} from '#lib/math/fraction.ts';
import { validate } from '#lib/schemas/errors.ts';
import { chapterSchema, type ChapterImport } from '#lib/schemas/chapter.ts';

const SAMPLE = 'static/samples/maths-3e-revisions.json';

/**
 * Convention for sample `calculation` exercises: the expression to compute is the LAST inline
 * formula `$…$` of the statement; if it contains "=", only its right-hand side.
 * Supported LaTeX: integers, decimals, + - \times \cdot \div, parentheses, \frac{}{},
 * ^n / ^{n} (integer exponents) and \sqrt{} of perfect squares.
 */
function expressionOf(statement: string): string {
	const formulas = [...statement.matchAll(/\$([^$]+)\$/g)].map((m) => m[1]);
	const last = formulas.at(-1);
	if (!last) throw new Error(`No $…$ formula in statement: ${statement}`);
	return last.split('=').at(-1)!.trim();
}

function tokenize(latex: string): string[] {
	const source = latex.replace(/\{,\}/g, ',').replace(/\\left|\\right/g, '');
	const tokens = source.match(/\\[a-z]+|\d+(?:[.,]\d+)?|[-+*/^(){}]|\S/g) ?? [];
	return tokens.map((t) => ({ '\\times': '*', '\\cdot': '*', '\\div': '/' })[t] ?? t);
}

function exactSqrt(f: Fraction): Fraction {
	const num = Math.sqrt(f.num);
	const den = Math.sqrt(f.den);
	if (!Number.isInteger(num) || !Number.isInteger(den)) {
		throw new Error(`Square root is not exact: ${toString(f)}`);
	}
	return fraction(num, den);
}

/** Recursive-descent evaluator over the token list. */
function evaluate(latex: string): Fraction {
	const tokens = tokenize(latex);
	let pos = 0;
	const peek = () => tokens[pos];
	const expect = (t: string) => {
		if (tokens[pos] !== t) throw new Error(`Expected "${t}" at token ${pos} in: ${latex}`);
		pos++;
	};
	const group = () => {
		expect('{');
		const value = expr();
		expect('}');
		return value;
	};

	function expr(): Fraction {
		let value = term();
		while (peek() === '+' || peek() === '-') {
			value = tokens[pos++] === '+' ? add(value, term()) : subtract(value, term());
		}
		return value;
	}
	function term(): Fraction {
		let value = unary();
		while (peek() === '*' || peek() === '/') {
			value = tokens[pos++] === '*' ? multiply(value, unary()) : divide(value, unary());
		}
		return value;
	}
	function unary(): Fraction {
		if (peek() === '-') {
			pos++;
			return multiply(fraction(-1), unary());
		}
		return powerOf();
	}
	function powerOf(): Fraction {
		const base = atom();
		if (peek() !== '^') return base;
		pos++;
		const exponent = peek() === '{' ? group() : atom();
		if (exponent.den !== 1) throw new Error(`Non-integer exponent in: ${latex}`);
		return power(base, exponent.num);
	}
	function atom(): Fraction {
		const token = tokens[pos++];
		if (token === '(') {
			const value = expr();
			expect(')');
			return value;
		}
		if (token === '{') {
			pos--;
			return group();
		}
		if (token === '\\frac') return divide(group(), group());
		if (token === '\\sqrt') return exactSqrt(group());
		if (token === '-') return multiply(fraction(-1), atom());
		const number = token === undefined ? null : parseFraction(token);
		if (!number) throw new Error(`Unexpected token "${token}" in: ${latex}`);
		return number;
	}

	const result = expr();
	if (pos !== tokens.length) throw new Error(`Unexpected "${tokens[pos]}" in: ${latex}`);
	return result;
}

const raw: unknown = JSON.parse(readFileSync(SAMPLE, 'utf8'));
const validation = validate(chapterSchema, raw);
const chapter = validation.success ? (validation.data as ChapterImport) : null;

describe('LaTeX evaluator (test helper)', () => {
	it('evaluates the supported syntax', () => {
		expect(toString(evaluate('\\frac{2}{3} \\times \\frac{4}{5}'))).toBe('8/15');
		expect(toString(evaluate('\\frac{3}{5} \\div \\frac{9}{10}'))).toBe('2/3');
		expect(toString(evaluate('10^{-2}'))).toBe('1/100');
		expect(toString(evaluate('\\sqrt{13^2 - 5^2}'))).toBe('12');
		expect(toString(evaluate('(1 + 2) \\cdot 3 - 2{,}5'))).toBe('13/2');
		expect(() => evaluate('\\sqrt{2}')).toThrow();
	});
});

describe(`sample ${SAMPLE}`, () => {
	it('is a valid pocketclass/chapter@1', () => {
		expect(validation.success ? [] : validation.errors).toEqual([]);
	});

	it('has the expected structure', () => {
		expect(chapter?.sheets.map((s) => s.id)).toEqual([
			'maths-3e-fractions',
			'maths-3e-powers',
			'maths-3e-pythagoras'
		]);
		const fractions = chapter?.sheets.find((c) => c.id === 'maths-3e-fractions');
		expect(fractions?.keyPoints.map((k) => k.id)).toEqual([
			'kp-simplify',
			'kp-add',
			'kp-multiply',
			'kp-divide',
			'kp-irreducible'
		]);
		expect(fractions?.sheet.sections).toHaveLength(4);
		expect(fractions?.exercises.length).toBeGreaterThanOrEqual(12);
		const types = new Set(fractions?.exercises.map((e) => e.type));
		expect([...types].sort()).toEqual([
			'calculation',
			'categorize',
			'cloze',
			'match',
			'mcq',
			'open',
			'ordering',
			'pair',
			'paper',
			'true_false'
		]);
		// Every key point has at least two assessment exercises (draw.perKeyPoint = 2).
		for (const kp of fractions?.keyPoints ?? []) {
			const drawable = fractions?.exercises.filter(
				(e) => e.keyPoint === kp.id && e.usage === 'assessment'
			);
			expect(drawable?.length, kp.id).toBeGreaterThanOrEqual(2);
		}
	});

	const calculations = (chapter?.sheets ?? []).flatMap((concept) =>
		concept.exercises
			.filter((e) => e.type === 'calculation')
			.map((exercise) => ({ concept: concept.id, exercise }))
	);

	it.each(calculations)('$concept / $exercise.id has a correct answer', ({ exercise }) => {
		if (exercise.type !== 'calculation') throw new Error('unreachable');
		const expected = evaluate(expressionOf(exercise.statement));
		const answer = parseFraction(exercise.answer);
		expect(answer, `answer "${exercise.answer}" is not a number`).not.toBeNull();
		expect(
			equals(answer!, expected),
			`answer ${exercise.answer} but expected ${toString(expected)}`
		).toBe(true);
		if (exercise.requireIrreducible) {
			expect(isIrreducible(answer!), `${exercise.answer} is not irreducible`).toBe(true);
		}
	});
});
