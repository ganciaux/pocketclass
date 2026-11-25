import type { Fraction } from '#lib/math/fraction.ts';

/**
 * Numbers as the child reads and types them: French decimal comma, never exponent notation.
 * Answers use `decimal` / `scaled` (what `parseFraction` reads); statements put numbers in KaTeX
 * with `tex`.
 */

/** Rounded to `digits` decimals, half away from zero (no 1.005 → 1.00 float surprise). */
export function round(value: number, digits = 0): number {
	const factor = 10 ** digits;
	return (
		(Math.sign(value) * Math.round(Number((Math.abs(value) * factor).toPrecision(15)))) / factor
	);
}

/** French decimal string: 3.5 → "3,5", 0.0035 → "0,0035" (at most `maxDecimals` decimals). */
export function decimal(value: number, maxDecimals = 6): string {
	const fixed = round(value, maxDecimals).toFixed(maxDecimals);
	const trimmed = fixed.includes('.') ? fixed.replace(/0+$/, '').replace(/\.$/, '') : fixed;
	return (trimmed === '-0' ? '0' : trimmed).replace('.', ',');
}

/** Exact French decimal of `digits × 10^exp` (`digits` an integer): scaled(35, -4) = "0,0035". */
export function scaled(digits: number, exp: number): string {
	if (!Number.isSafeInteger(digits)) throw new Error(`Not an integer: ${digits}`);
	let s = String(Math.abs(digits));
	if (exp >= 0) {
		s = digits === 0 ? '0' : s + '0'.repeat(exp);
	} else {
		const k = -exp;
		s = s.padStart(k + 1, '0');
		s = `${s.slice(0, -k)},${s.slice(-k)}`.replace(/0+$/, '').replace(/,$/, '');
	}
	return digits < 0 && s !== '0' ? `-${s}` : s;
}

/** A number for KaTeX: "3{,}5" (no space after the comma), thousands spaced from 10 000. */
export function tex(value: number | string): string {
	const s = typeof value === 'number' ? decimal(value) : value;
	const [whole, decimals] = s.split(',');
	const sign = whole.startsWith('-') ? '-' : '';
	const digits = sign ? whole.slice(1) : whole;
	const grouped = digits.length >= 5 ? digits.replace(/\B(?=(\d{3})+$)/g, '\\,') : digits;
	return sign + grouped + (decimals === undefined ? '' : `{,}${decimals}`);
}

/** A negative number in brackets, for a term after an operator: 3 - (-2). */
export const paren = (value: number | string) =>
	String(value).startsWith('-') ? `(${tex(value)})` : tex(value);

/** A fraction for KaTeX, as written (not simplified): -\frac{3}{4}, or the integer when den = 1. */
export function fracTex(f: Fraction): string {
	if (f.den === 1) return tex(f.num);
	return `${f.num < 0 ? '-' : ''}\\frac{${Math.abs(f.num)}}{${f.den}}`;
}

/** A fraction after an operator: brackets when negative. */
export const fracFactor = (f: Fraction) =>
	f.num < 0 ? `\\left(${fracTex(f)}\\right)` : fracTex(f);

/** "1 rang", "3 rangs": plural of a French word for generated statements. */
export const count = (n: number, word: string) => `${n} ${word}${Math.abs(n) > 1 ? 's' : ''}`;
