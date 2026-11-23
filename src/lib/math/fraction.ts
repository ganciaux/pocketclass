/**
 * Small exact-fraction library (integers only, enough for middle-school maths).
 * Fractions are immutable; operations return simplified results with a positive denominator.
 * `parseFraction` keeps the form as written so irreducibility can be checked on a user answer.
 */
export interface Fraction {
	readonly num: number;
	readonly den: number;
}

export function gcd(a: number, b: number): number {
	a = Math.abs(a);
	b = Math.abs(b);
	while (b !== 0) [a, b] = [b, a % b];
	return a;
}

export function fraction(num: number, den = 1): Fraction {
	if (!Number.isInteger(num) || !Number.isInteger(den)) {
		throw new Error(`Fraction terms must be integers: ${num}/${den}`);
	}
	if (den === 0) throw new Error('Denominator cannot be zero');
	return den < 0 ? { num: -num, den: -den } : { num, den };
}

export function simplify(f: Fraction): Fraction {
	const d = gcd(f.num, f.den) || 1;
	return fraction(f.num / d, f.den / d);
}

/**
 * Parses "3", "-2", "2,5", "2.5", "12/18", "-3 / 4" or a number. Returns null if invalid.
 * The result is NOT simplified ("12/18" stays 12/18; "2,5" becomes 25/10).
 */
export function parseFraction(input: string | number): Fraction | null {
	if (typeof input === 'number') {
		return Number.isFinite(input) ? parseFraction(String(input)) : null;
	}
	const value = input.trim();

	const ratio = /^(-?\d+)\s*\/\s*(-?\d+)$/.exec(value);
	if (ratio) {
		const den = Number(ratio[2]);
		return den === 0 ? null : fraction(Number(ratio[1]), den);
	}

	const decimal = /^(-?)(\d+)(?:[.,](\d+))?$/.exec(value);
	if (decimal) {
		const [, sign, whole, decimals = ''] = decimal;
		const num = Number(whole + decimals) * (sign ? -1 : 1);
		return fraction(num, 10 ** decimals.length);
	}
	return null;
}

export const add = (a: Fraction, b: Fraction) =>
	simplify(fraction(a.num * b.den + b.num * a.den, a.den * b.den));

export const subtract = (a: Fraction, b: Fraction) => add(a, fraction(-b.num, b.den));

export const multiply = (a: Fraction, b: Fraction) =>
	simplify(fraction(a.num * b.num, a.den * b.den));

export function divide(a: Fraction, b: Fraction): Fraction {
	if (b.num === 0) throw new Error('Division by zero');
	return multiply(a, fraction(b.den, b.num));
}

/** Integer exponent, negative allowed: (2/3)^-2 = 9/4. */
export function power(f: Fraction, exponent: number): Fraction {
	if (!Number.isInteger(exponent)) throw new Error(`Exponent must be an integer: ${exponent}`);
	const base = exponent < 0 ? divide(fraction(1), f) : f;
	const n = Math.abs(exponent);
	return simplify(fraction(base.num ** n, base.den ** n));
}

/** Same value, whatever the written form (2/4 equals 1/2). */
export const equals = (a: Fraction, b: Fraction) => a.num * b.den === b.num * a.den;

/** True if the fraction cannot be simplified (an integer written as n/1 or n is irreducible). */
export const isIrreducible = (f: Fraction) => gcd(f.num, f.den) === 1 || f.num === 0;

export function toString(f: Fraction): string {
	return f.den === 1 ? String(f.num) : `${f.num}/${f.den}`;
}
