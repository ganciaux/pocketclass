import {
	add,
	divide,
	fraction,
	gcd,
	multiply,
	subtract,
	toString,
	type Fraction
} from '#lib/math/fraction.ts';
import { calculation, mcq, trueFalse } from './build.ts';
import { count, decimal, fracFactor, fracTex, paren, scaled, tex } from './format.ts';
import { chance, int, nonZero, pick } from './random.ts';
import type { Generator, Random } from './types.ts';

// Family « Calcul »: fractions, powers, order of operations, percentages.

const IRREDUCIBLE = 'Calcule et donne le résultat sous forme irréductible : ';

const lcm = (a: number, b: number) => (a / gcd(a, b)) * b;

/** A positive irreducible fraction that is not an integer, denominator ≤ `maxDen`. */
const properish = (random: Random, maxDen: number) => overDen(random, int(random, 2, maxDen));

/** An irreducible fraction with this denominator (≥ 2), numerator below twice it. */
function overDen(random: Random, den: number): Fraction {
	for (;;) {
		const num = int(random, 1, 2 * den - 1);
		if (gcd(num, den) === 1) return fraction(num, den);
	}
}

const negate = (f: Fraction) => fraction(-f.num, f.den);
const same = (a: Fraction, b: Fraction) => a.num === b.num && a.den === b.den;
/** " = result" when the computed fraction still simplifies. */
const thenSimplified = (raw: Fraction, result: Fraction) =>
	same(raw, result) ? '' : ` = ${fracTex(result)}`;

const fractionsSimplify: Generator = {
	id: 'fractions.simplify',
	family: 'calculation',
	grades: ['5e', '4e', '3e'],
	label: 'simplifier une fraction (réponse irréductible) ; 3 : fractions négatives',
	generate(random, { difficulty }) {
		const base = properish(random, [9, 12, 15][difficulty - 1]);
		const k = difficulty === 1 ? int(random, 2, 5) : int(random, difficulty === 2 ? 2 : 4, 12);
		const signed = difficulty === 3 && chance(random) ? negate(base) : base;
		const written = fraction(signed.num * k, signed.den * k);
		const sign = signed.num < 0 ? '-' : '';
		const [a, b] = [Math.abs(written.num), written.den];
		return calculation(
			`Écris sous forme irréductible : $${fracTex(written)}$`,
			toString(signed),
			`$${a}$ et $${b}$ sont divisibles par $${k}$ : $${fracTex(written)} = ${sign}\\frac{${a} \\div ${k}}{${b} \\div ${k}} = ${fracTex(signed)}$.`,
			true
		);
	}
};

/** Two fractions for an addition, by difficulty: same denominator, multiple, any. */
function addTerms(random: Random, difficulty: number): [Fraction, Fraction] {
	if (difficulty === 1) {
		const den = int(random, 3, 12);
		return [fraction(int(random, 1, den - 1), den), fraction(int(random, 1, den - 1), den)];
	}
	if (difficulty === 2) {
		const small = int(random, 2, 6);
		const big = small * int(random, 2, 4);
		const pair: [Fraction, Fraction] = [overDen(random, small), overDen(random, big)];
		return chance(random) ? pair : [pair[1], pair[0]];
	}
	for (;;) {
		const a = properish(random, 10);
		const b = properish(random, 10);
		if (a.den !== b.den) return [a, b];
	}
}

const fractionsAdd: Generator = {
	id: 'fractions.add',
	family: 'calculation',
	grades: ['5e', '4e', '3e'],
	label:
		'additionner ou soustraire deux fractions ; 1 : même dénominateur, 2 : un dénominateur multiple de l’autre, 3 : quelconques',
	generate(random, { difficulty }) {
		const [a, b] = addTerms(random, difficulty);
		const minus =
			difficulty === 1 ? chance(random, 0.3) && a.num * b.den > b.num * a.den : chance(random, 0.4);
		const op = minus ? '-' : '+';
		const result = minus ? subtract(a, b) : add(a, b);
		const den = lcm(a.den, b.den);
		const [na, nb] = [a.num * (den / a.den), b.num * (den / b.den)];
		const raw = fraction(minus ? na - nb : na + nb, den);
		const expression = `${fracTex(a)} ${op} ${fracTex(b)}`;
		const explanation =
			a.den === b.den
				? `Même dénominateur : on ${minus ? 'soustrait' : 'additionne'} les numérateurs. $${expression} = ${fracTex(raw)}${thenSimplified(raw, result)}$.`
				: `On met au même dénominateur $${den}$ : $${expression} = \\frac{${na}}{${den}} ${op} \\frac{${nb}}{${den}} = ${fracTex(raw)}${thenSimplified(raw, result)}$.`;
		return calculation(`${IRREDUCIBLE}$${expression}$`, toString(result), explanation, true);
	}
};

/** Two factors: positive, then with simplification, then negative or integer. */
function productTerms(random: Random, difficulty: number): [Fraction, Fraction] {
	const maxDen = difficulty === 1 ? 6 : 10;
	const a = properish(random, maxDen);
	let b = properish(random, maxDen);
	// From difficulty 2, a product that simplifies (a factor to cancel) when one is found.
	const cancels = (f: Fraction) => gcd(a.den, f.num) > 1 || gcd(a.num, f.den) > 1;
	for (let i = 0; difficulty >= 2 && i < 30 && !cancels(b); i++) b = properish(random, maxDen);
	if (difficulty === 3) {
		if (chance(random, 0.3)) return [fraction(int(random, 2, 9)), b];
		return chance(random) ? [negate(a), b] : [a, negate(b)];
	}
	return [a, b];
}

function productExplanation(a: Fraction, b: Fraction, result: Fraction): string {
	const raw = fraction(a.num * b.num, a.den * b.den);
	return `On multiplie les numérateurs entre eux et les dénominateurs entre eux : $\\frac{${paren(a.num)} \\times ${paren(b.num)}}{${a.den} \\times ${b.den}} = ${fracTex(raw)}${thenSimplified(raw, result)}$.`;
}

const fractionsMultiply: Generator = {
	id: 'fractions.multiply',
	family: 'calculation',
	grades: ['4e', '3e'],
	label: 'multiplier deux fractions (réponse irréductible) ; 3 : nombres négatifs ou entier',
	generate(random, { difficulty }) {
		const [a, b] = productTerms(random, difficulty);
		const result = multiply(a, b);
		return calculation(
			`${IRREDUCIBLE}$${fracTex(a)} \\times ${fracFactor(b)}$`,
			toString(result),
			productExplanation(a, b, result),
			true
		);
	}
};

const fractionsDivide: Generator = {
	id: 'fractions.divide',
	family: 'calculation',
	grades: ['4e', '3e'],
	label: 'diviser par une fraction (réponse irréductible) ; 3 : nombres négatifs ou entier',
	generate(random, { difficulty }) {
		const [a, b] = productTerms(random, difficulty);
		const inverse = fraction(b.den, b.num);
		const result = divide(a, b);
		return calculation(
			`${IRREDUCIBLE}$${fracTex(a)} \\div ${fracFactor(b)}$`,
			toString(result),
			`Diviser par $${fracTex(b)}$, c'est multiplier par son inverse $${fracTex(inverse)}$. ${productExplanation(a, inverse, result)}`,
			true
		);
	}
};

const fractionsCompare: Generator = {
	id: 'fractions.compare',
	family: 'calculation',
	grades: ['6e', '5e', '4e', '3e'],
	label:
		'vrai ou faux : comparer deux fractions ; 1 : même dénominateur, 2 : un dénominateur multiple de l’autre, 3 : quelconques ou négatives',
	generate(random, { difficulty }) {
		let [a, b] = addTerms(random, difficulty);
		while (a.num * b.den === b.num * a.den) [a, b] = addTerms(random, difficulty);
		if (difficulty === 3 && chance(random, 0.3)) [a, b] = [negate(a), negate(b)];
		const less = a.num * b.den < b.num * a.den;
		const shown = chance(random) ? '<' : '>';
		const truth = less ? '<' : '>';
		const den = lcm(a.den, b.den);
		const [na, nb] = [a.num * (den / a.den), b.num * (den / b.den)];
		const conclusion = `donc $${fracTex(a)} ${truth} ${fracTex(b)}$.`;
		return trueFalse(
			`$${fracTex(a)} ${shown} ${fracTex(b)}$`,
			shown === truth,
			a.den === b.den
				? `Même dénominateur : on compare les numérateurs, $${na} ${truth} ${nb}$, ${conclusion}`
				: `Au même dénominateur $${den}$ : $\\frac{${na}}{${den}}$ et $\\frac{${nb}}{${den}}$, ${conclusion}`
		);
	}
};

const repeated = (base: string, n: number) =>
	Array.from({ length: n }, () => base).join(' \\times ');

const powersCompute: Generator = {
	id: 'powers.compute',
	family: 'calculation',
	grades: ['4e', '3e'],
	label:
		'calculer une puissance ; 1 : entiers positifs, 2 : base négative et piège −3², 3 : exposant négatif',
	generate(random, { difficulty }) {
		if (difficulty === 1) {
			const base = int(random, 2, 10);
			const exp = base === 2 ? int(random, 0, 6) : int(random, 0, 3);
			const value = base ** exp;
			const why =
				exp === 0
					? 'Tout nombre non nul à la puissance 0 vaut 1.'
					: `$${base}^{${exp}} = ${repeated(String(base), exp)} = ${tex(value)}$.`;
			return calculation(`Calcule $${base}^{${exp}}$`, String(value), why);
		}
		if (difficulty === 2) {
			const base = int(random, 2, 5);
			const exp = int(random, 2, base === 2 ? 5 : 4);
			if (chance(random, 0.35)) {
				return calculation(
					`Calcule $-${base}^{${exp}}$`,
					String(-(base ** exp)),
					`Sans parenthèses, la puissance porte seulement sur $${base}$ : $-${base}^{${exp}} = -(${repeated(String(base), exp)}) = ${-(base ** exp)}$.`
				);
			}
			const value = (-base) ** exp;
			return calculation(
				`Calcule $(-${base})^{${exp}}$`,
				String(value),
				`$(-${base})^{${exp}} = ${repeated(`(-${base})`, exp)} = ${value}$ (exposant ${exp % 2 === 0 ? 'pair : résultat positif' : 'impair : résultat négatif'}).`
			);
		}
		const base = pick(random, [2, 4, 5, 10, 10, 3]);
		const n = base === 10 ? int(random, 1, 5) : int(random, 1, base === 2 ? 4 : 2);
		const den = base ** n;
		const asDecimal = base === 3 ? '' : ` = ${tex(decimal(1 / den))}`;
		return calculation(
			`Calcule $${base}^{-${n}}$ (fraction ou nombre décimal)`,
			`1/${den}`,
			`$${base}^{-${n}} = \\frac{1}{${base}^{${n}}} = \\frac{1}{${tex(den)}}${asDecimal}$.`
		);
	}
};

const powerTex = (base: string, exp: number) => `${base}^{${exp}}`;
const sumTex = (m: number, n: number, op: '+' | '-') => `${m} ${op} ${paren(n)}`;

const powersRules: Generator = {
	id: 'powers.rules',
	family: 'calculation',
	grades: ['4e', '3e'],
	label:
		'QCM : écrire sous la forme d’une seule puissance (produit, quotient, puissance de puissance) ; 3 : exposants négatifs',
	generate(random, { difficulty }) {
		const numeric = difficulty === 1 || chance(random);
		const baseNumber = int(random, 2, 9);
		const base = numeric ? String(baseNumber) : pick(random, ['a', 'x']);
		const exponent = () => (difficulty === 3 ? nonZero(random, -5, 6) : int(random, 2, 7));
		const [m, n] = [exponent(), exponent()];
		const kind =
			difficulty === 1
				? pick(random, ['product', 'power'] as const)
				: pick(random, ['product', 'quotient', 'power'] as const);
		const option = (exp: number) => `$${powerTex(base, exp)}$`;
		const squared = numeric ? String(baseNumber * baseNumber) : `(${base}^{2})`;
		if (kind === 'product') {
			return mcq(
				`Écris sous la forme d'une seule puissance : $${powerTex(base, m)} \\times ${powerTex(base, n)}$`,
				option(m + n),
				[
					...(m + n === 0 ? [] : [`$${squared}^{${m + n}}$`]),
					option(m * n),
					option(m - n),
					option(m + n + 1),
					option(m + n - 1)
				],
				`On garde la base et on additionne les exposants : $${powerTex(base, m)} \\times ${powerTex(base, n)} = ${base}^{${sumTex(m, n, '+')}} = ${powerTex(base, m + n)}$.`
			);
		}
		if (kind === 'quotient') {
			return mcq(
				`Écris sous la forme d'une seule puissance : $\\frac{${powerTex(base, m)}}{${powerTex(base, n)}}$`,
				option(m - n),
				[option(m + n), option(n - m), option(m * n), option(m - n + 1), option(m - n - 1)],
				`On garde la base et on soustrait les exposants : $\\frac{${powerTex(base, m)}}{${powerTex(base, n)}} = ${base}^{${sumTex(m, n, '-')}} = ${powerTex(base, m - n)}$.`
			);
		}
		return mcq(
			`Écris sous la forme d'une seule puissance : $(${powerTex(base, m)})^{${n}}$`,
			option(m * n),
			[option(m + n), option(m - n), option(m * n + 1), option(m * n - 1), option(m * n + 2)],
			`On garde la base et on multiplie les exposants : $(${powerTex(base, m)})^{${n}} = ${base}^{${paren(m)} \\times ${paren(n)}} = ${powerTex(base, m * n)}$.`
		);
	}
};

const powersScientific: Generator = {
	id: 'powers.scientific',
	family: 'calculation',
	grades: ['4e', '3e'],
	label:
		'notation scientifique : écriture décimale de a × 10ⁿ, ou QCM de l’écriture scientifique d’un nombre ; 1 : exposants positifs',
	generate(random, { difficulty }) {
		const decimals = difficulty === 1 ? 1 : int(random, 1, 2);
		let digits = int(random, 10 ** decimals + 1, 10 ** (decimals + 1) - 1);
		while (digits % 10 === 0) digits = int(random, 10 ** decimals + 1, 10 ** (decimals + 1) - 1);
		const exp = [
			() => int(random, 1, 4),
			() => nonZero(random, -4, 6),
			() => nonZero(random, -6, 8)
		][difficulty - 1]();
		const mantissa = tex(scaled(digits, -decimals));
		const value = tex(scaled(digits, exp - decimals));
		const scientific = (m: string, e: number) => `$${m} \\times 10^{${e}}$`;
		if (difficulty === 1 || chance(random)) {
			const way = exp > 0 ? 'droite' : 'gauche';
			return calculation(
				`Donne l'écriture décimale de $${mantissa} \\times 10^{${exp}}$`,
				scaled(digits, exp - decimals),
				`Multiplier par $10^{${exp}}$, c'est décaler la virgule de ${count(Math.abs(exp), 'rang')} vers la ${way} : $${mantissa} \\times 10^{${exp}} = ${value}$.`
			);
		}
		return mcq(
			`Quelle est l'écriture scientifique de $${value}$ ?`,
			scientific(mantissa, exp),
			[
				scientific(mantissa, exp + 1),
				scientific(mantissa, exp - 1),
				scientific(tex(scaled(digits, 1 - decimals)), exp - 1),
				scientific(tex(scaled(digits, -1 - decimals)), exp + 1),
				scientific(mantissa, -exp)
			],
			`Un seul chiffre non nul avant la virgule : $${value} = ${mantissa} \\times 10^{${exp}}$.`
		);
	}
};

/** One expression for the order of operations, with its steps. */
interface Priority {
	tex: string;
	value: number;
	steps: string[];
}

function priorityExpression(random: Random, difficulty: number): Priority {
	const n = (min = 2, max = 9) => int(random, min, max);
	const templates: (() => Priority)[][] = [
		[
			() => {
				const [a, b, c] = [n(1, 20), n(), n()];
				return {
					tex: `${a} + ${b} \\times ${c}`,
					value: a + b * c,
					steps: [`${b} \\times ${c} = ${b * c}`, `${a} + ${b * c} = ${a + b * c}`]
				};
			},
			() => {
				const [a, b, c] = [n(), n(1, 12), n(1, 12)];
				return {
					tex: `${a} \\times (${b} + ${c})`,
					value: a * (b + c),
					steps: [`${b} + ${c} = ${b + c}`, `${a} \\times ${b + c} = ${a * (b + c)}`]
				};
			},
			() => {
				const [b, q, c] = [n(), n(), n(1, 20)];
				const a = b * q;
				return {
					tex: `${c} + ${a} \\div ${b}`,
					value: c + q,
					steps: [`${a} \\div ${b} = ${q}`, `${c} + ${q} = ${c + q}`]
				};
			}
		],
		[
			() => {
				const [b, c, d] = [n(), n(), n(1, 15)];
				const a = b * c + n(0, 20);
				const v = a - b * c + d;
				return {
					tex: `${a} - ${b} \\times ${c} + ${d}`,
					value: v,
					steps: [`${b} \\times ${c} = ${b * c}`, `${a} - ${b * c} + ${d} = ${v}`]
				};
			},
			() => {
				const [a, b, c] = [n(1, 12), n(1, 12), n()];
				const d = n(1, (a + b) * c);
				const v = (a + b) * c - d;
				return {
					tex: `(${a} + ${b}) \\times ${c} - ${d}`,
					value: v,
					steps: [
						`${a} + ${b} = ${a + b}`,
						`${a + b} \\times ${c} = ${(a + b) * c}`,
						`${(a + b) * c} - ${d} = ${v}`
					]
				};
			},
			() => {
				const [a, b, c, d] = [n(), n(), n(), n()];
				const v = a * b + c * d;
				return {
					tex: `${a} \\times ${b} + ${c} \\times ${d}`,
					value: v,
					steps: [
						`${a} \\times ${b} = ${a * b}`,
						`${c} \\times ${d} = ${c * d}`,
						`${a * b} + ${c * d} = ${v}`
					]
				};
			}
		],
		[
			() => {
				const [a, b, c] = [n(1, 20), n(), n(1, 5)];
				const d = c + n(1, 6);
				const inner = c - d;
				const v = a - b * inner;
				return {
					tex: `${a} - ${b} \\times (${c} - ${d})`,
					value: v,
					steps: [
						`${c} - ${d} = ${inner}`,
						`${b} \\times (${inner}) = ${b * inner}`,
						`${a} - (${b * inner}) = ${v}`
					]
				};
			},
			() => {
				const [a, b, c] = [n(1, 20), n(2, 5), n()];
				const v = a - b * b * c;
				return {
					tex: `${a} - ${b}^{2} \\times ${c}`,
					value: v,
					steps: [
						`${b}^{2} = ${b * b}`,
						`${b * b} \\times ${c} = ${b * b * c}`,
						`${a} - ${b * b * c} = ${v}`
					]
				};
			},
			() => {
				const [a, c] = [n(1, 9), n(1, 30)];
				const b = a + n(1, 6);
				const v = (a - b) ** 2 - c;
				return {
					tex: `(${a} - ${b})^{2} - ${c}`,
					value: v,
					steps: [
						`${a} - ${b} = ${a - b}`,
						`(${a - b})^{2} = ${(a - b) ** 2}`,
						`${(a - b) ** 2} - ${c} = ${v}`
					]
				};
			}
		]
	];
	return pick(random, templates[difficulty - 1])();
}

const numbersPriority: Generator = {
	id: 'numbers.priority',
	family: 'calculation',
	grades: ['6e', '5e', '4e', '3e'],
	label: 'calculer en respectant les priorités opératoires ; 3 : nombres négatifs et carrés',
	generate(random, { difficulty }) {
		const expression = priorityExpression(random, difficulty);
		return calculation(
			`Calcule : $${expression.tex}$`,
			String(expression.value),
			`Parenthèses, puis puissances, puis multiplications et divisions, puis additions et soustractions : ${expression.steps.map((s) => `$${s}$`).join(', puis ')}.`
		);
	}
};

const percentApply: Generator = {
	id: 'percent.apply',
	family: 'calculation',
	grades: ['6e', '5e', '4e', '3e'],
	label:
		'pourcentages ; 1 : p % d’une quantité, 2 : prix après une hausse ou une baisse, 3 : retrouver le pourcentage d’évolution',
	generate(random, { difficulty }) {
		const pct = (p: number) => `${p}\\,\\%`;
		if (difficulty === 1) {
			const p = pick(random, [10, 20, 25, 50, 75]);
			const base = 20 * int(random, 1, 20);
			const value = (p * base) / 100;
			return calculation(
				`Calcule $${pct(p)}$ de $${base}$.`,
				String(value),
				`$${pct(p)}$ de $${base}$, c'est $\\frac{${p}}{100} \\times ${base} = ${value}$.`
			);
		}
		const base = 20 * int(random, 1, 15);
		const p = 5 * int(random, 1, 10);
		const up = chance(random);
		const change = (p * base) / 100;
		const after = up ? base + change : base - change;
		const word = up ? 'augmente' : 'baisse';
		if (difficulty === 2) {
			return calculation(
				`Un article coûte $${base}$ €. Son prix ${word} de $${pct(p)}$. Quel est son nouveau prix, en € ?`,
				String(after),
				`${up ? 'Hausse' : 'Baisse'} : $\\frac{${p}}{100} \\times ${base} = ${change}$ €, donc $${base} ${up ? '+' : '-'} ${change} = ${after}$ €.`
			);
		}
		return calculation(
			`Un prix passe de $${base}$ € à $${after}$ €. De quel pourcentage a-t-il ${up ? 'augmenté' : 'baissé'} ?`,
			String(p),
			`L'écart est de $${change}$ € et $\\frac{${change}}{${base}} = ${tex(decimal(p / 100))} = ${pct(p)}$.`
		);
	}
};

export const calculationGenerators: Generator[] = [
	fractionsSimplify,
	fractionsAdd,
	fractionsMultiply,
	fractionsDivide,
	fractionsCompare,
	powersCompute,
	powersRules,
	powersScientific,
	numbersPriority,
	percentApply
];
