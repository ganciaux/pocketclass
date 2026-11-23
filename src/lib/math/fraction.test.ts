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
	simplify,
	subtract,
	toString
} from './fraction.ts';

const f = (s: string) => {
	const value = parseFraction(s);
	if (!value) throw new Error(`invalid fraction ${s}`);
	return value;
};

describe('fraction', () => {
	it('parses integers, decimals and ratios without simplifying', () => {
		expect(parseFraction('3')).toEqual({ num: 3, den: 1 });
		expect(parseFraction('-2')).toEqual({ num: -2, den: 1 });
		expect(parseFraction('2,5')).toEqual({ num: 25, den: 10 });
		expect(parseFraction('0.125')).toEqual({ num: 125, den: 1000 });
		expect(parseFraction(' 12 / 18 ')).toEqual({ num: 12, den: 18 });
		expect(parseFraction('3/-4')).toEqual({ num: -3, den: 4 });
		expect(parseFraction(7)).toEqual({ num: 7, den: 1 });
	});

	it('rejects invalid input', () => {
		for (const bad of ['', 'abc', '1/0', '1/2/3', '1,2,3', '½']) {
			expect(parseFraction(bad)).toBeNull();
		}
		expect(() => fraction(1, 0)).toThrow();
	});

	it('simplifies with a positive denominator', () => {
		expect(simplify(f('12/18'))).toEqual({ num: 2, den: 3 });
		expect(simplify(f('-6/-8'))).toEqual({ num: 3, den: 4 });
		expect(simplify(f('0/5'))).toEqual({ num: 0, den: 1 });
	});

	it('computes the four operations and powers', () => {
		expect(toString(add(f('2/7'), f('3/7')))).toBe('5/7');
		expect(toString(add(f('1/6'), f('1/6')))).toBe('1/3');
		expect(toString(subtract(f('1/2'), f('3/4')))).toBe('-1/4');
		expect(toString(multiply(f('3/4'), f('2/9')))).toBe('1/6');
		expect(toString(divide(f('3/5'), f('9/10')))).toBe('2/3');
		expect(toString(power(f('2'), 5))).toBe('32');
		expect(toString(power(f('10'), -2))).toBe('1/100');
		expect(toString(power(f('2/3'), -2))).toBe('9/4');
		expect(() => divide(f('1'), f('0'))).toThrow();
	});

	it('compares by value and checks irreducibility of the written form', () => {
		expect(equals(f('2/4'), f('1/2'))).toBe(true);
		expect(equals(f('0,5'), f('1/2'))).toBe(true);
		expect(equals(f('2/3'), f('3/2'))).toBe(false);
		expect(isIrreducible(f('2/3'))).toBe(true);
		expect(isIrreducible(f('12/18'))).toBe(false);
		expect(isIrreducible(f('5'))).toBe(true);
	});
});
