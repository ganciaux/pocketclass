import { describe, expect, it } from 'vitest';
import { fraction } from '#lib/math/fraction.ts';
import { decimal, fracTex, paren, round, scaled, tex } from './format.ts';

describe('round', () => {
	it('rounds half away from zero without float surprises', () => {
		expect(round(1.005, 2)).toBe(1.01);
		expect(round(2.45, 1)).toBe(2.5);
		expect(round(-2.45, 1)).toBe(-2.5);
		expect(round(12.34)).toBe(12);
	});
});

describe('decimal', () => {
	it('writes French decimals, never exponent notation', () => {
		expect(decimal(3.5)).toBe('3,5');
		expect(decimal(0.0000035)).toBe('0,000004');
		expect(decimal(0.0000035, 7)).toBe('0,0000035');
		expect(decimal(0.1 + 0.2)).toBe('0,3');
		expect(decimal(1e21 / 1e12)).toBe('1000000000');
		expect(decimal(-0.0000001)).toBe('0');
	});
});

describe('scaled', () => {
	it('shifts the comma exactly', () => {
		expect(scaled(35, -4)).toBe('0,0035');
		expect(scaled(35, 2)).toBe('3500');
		expect(scaled(350, -1)).toBe('35');
		expect(scaled(-125, -2)).toBe('-1,25');
		expect(scaled(0, -3)).toBe('0');
		expect(scaled(7, 0)).toBe('7');
	});
});

describe('tex', () => {
	it('keeps the comma tight and spaces thousands from 10 000', () => {
		expect(tex('3,5')).toBe('3{,}5');
		expect(tex(1234)).toBe('1234');
		expect(tex(1234567)).toBe('1\\,234\\,567');
		expect(tex('-12345,6')).toBe('-12\\,345{,}6');
		expect(paren(-2)).toBe('(-2)');
		expect(paren(2)).toBe('2');
	});

	it('writes fractions as given', () => {
		expect(fracTex(fraction(-6, 8))).toBe('-\\frac{6}{8}');
		expect(fracTex(fraction(5, 1))).toBe('5');
	});
});
