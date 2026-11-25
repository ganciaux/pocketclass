import { fraction, gcd, simplify, toString } from '#lib/math/fraction.ts';
import { calculation, mcq } from './build.ts';
import { fracTex, paren } from './format.ts';
import { chance, int, nonZero, pick } from './random.ts';
import type { Generator, Random } from './types.ts';

// Family « Algèbre »: equations, expanding and factorising (MCQ of typical mistakes).

/** `[coefficient, degree]` terms as written, not merged: 3x^{2} - x + 2. */
export function termsTex(terms: [number, number][], letter = 'x'): string {
	const parts = terms
		.filter(([c]) => c !== 0)
		.map(([c, degree], i) => {
			const power = degree === 0 ? '' : degree === 1 ? letter : `${letter}^{${degree}}`;
			const size = Math.abs(c) === 1 && degree > 0 ? '' : String(Math.abs(c));
			const sign = c < 0 ? (i === 0 ? '-' : ' - ') : i === 0 ? '' : ' + ';
			return sign + size + power;
		});
	return parts.join('') || '0';
}

/** A polynomial from its coefficients, highest degree first: [3, 0, -2] → 3x^{2} - 2. */
export const poly = (coefficients: number[], letter = 'x') =>
	termsTex(
		coefficients.map((c, i): [number, number] => [c, coefficients.length - 1 - i]),
		letter
	);

/** An expression shown in an MCQ, with its value (to never offer an equivalent distractor). */
interface Expr {
	tex: string;
	at: (x: number) => number;
}

const POINTS = [-2.5, 0.5, 1, 3];
const equivalent = (a: Expr, b: Expr) => POINTS.every((x) => Math.abs(a.at(x) - b.at(x)) < 1e-9);

const polyExpr = (coefficients: number[]): Expr => ({
	tex: poly(coefficients),
	at: (x) => coefficients.reduce((sum, c) => sum * x + c, 0)
});
/** bx + a */
const lin = (b: number, a: number) => polyExpr([b, a]);
const squared = (e: Expr): Expr => ({ tex: `(${e.tex})^{2}`, at: (x) => e.at(x) ** 2 });
const product = (e: Expr, f: Expr): Expr => ({
	tex: `(${e.tex})(${f.tex})`,
	at: (x) => e.at(x) * f.at(x)
});
/** k(e), or kx(e) with `withX`: the factor in front of a bracket. */
function factor(k: number, e: Expr, withX = false): Expr {
	const front = `${k === -1 ? '-' : k === 1 ? '' : k}${withX ? 'x' : ''}`;
	return { tex: `${front}(${e.tex})`, at: (x) => k * (withX ? x : 1) * e.at(x) };
}

/** An MCQ on expressions: candidates equivalent to the answer are dropped. */
function exprMcq(question: string, answer: Expr, candidates: Expr[], explanation: string) {
	return mcq(
		question,
		`$${answer.tex}$`,
		candidates.filter((c) => !equivalent(c, answer)).map((c) => `$${c.tex}$`),
		explanation
	);
}

/** "x = 7/3" as an explanation ending: the raw quotient, then simplified if it changes. */
function solution(top: number, coefficient: number): { answer: string; tex: string } {
	const raw = fraction(top, coefficient);
	const result = simplify(raw);
	const rawTex = coefficient === 1 ? String(top) : fracTex(raw);
	const resultTex = fracTex(result);
	return {
		answer: toString(result),
		tex: rawTex === resultTex ? rawTex : `${rawTex} = ${resultTex}`
	};
}

const ASK_X = 'Donne la valeur de $x$ (fraction si besoin).';

const equationsLinear: Generator = {
	id: 'equations.linear',
	family: 'algebra',
	grades: ['4e', '3e'],
	label:
		'résoudre ax + b = c ; 1 : entiers positifs, 2 : nombres négatifs, 3 : solution fractionnaire',
	generate(random, { difficulty }) {
		let a: number, x: number, b: number, c: number;
		if (difficulty === 1) {
			[a, x, b] = [int(random, 2, 9), int(random, 1, 10), int(random, 1, 20)];
			c = a * x + b;
		} else if (difficulty === 2) {
			[a, x, b] = [
				pick(random, [-9, -7, -5, -4, -3, -2, -1, 2, 3, 4, 5, 6, 7, 8, 9]),
				nonZero(random, -10, 10),
				nonZero(random, -20, 20)
			];
			c = a * x + b;
		} else {
			a = int(random, 2, 9);
			b = nonZero(random, -15, 15);
			let top = nonZero(random, -30, 30);
			while (top % a === 0) top = nonZero(random, -30, 30);
			c = top + b;
		}
		const { answer, tex } = solution(c - b, a);
		return calculation(
			`Résous l'équation $${poly([a, b])} = ${c}$. ${ASK_X}`,
			answer,
			`On ${b > 0 ? 'soustrait' : 'ajoute'} $${Math.abs(b)}$ aux deux membres : $${poly([a, 0])} = ${c - b}$, puis on divise par $${paren(a)}$ : $x = ${tex}$.`
		);
	}
};

const equationsBothSides: Generator = {
	id: 'equations.both_sides',
	family: 'algebra',
	grades: ['4e', '3e'],
	label:
		'résoudre ax + b = cx + d ; 1 : entiers positifs, 2 : nombres négatifs, 3 : solution fractionnaire',
	generate(random, { difficulty }) {
		let a: number, c: number, b: number, d: number;
		if (difficulty === 1) {
			c = int(random, 1, 6);
			a = c + int(random, 1, 5);
			const x = int(random, 1, 10);
			b = int(random, 1, 15);
			d = (a - c) * x + b;
		} else {
			a = nonZero(random, -9, 9);
			c = nonZero(random, -9, 9);
			// Difficulty 3: a - c of at least 2, so that the solution can be a fraction.
			while (c === a || (difficulty === 3 && Math.abs(a - c) < 2)) c = nonZero(random, -9, 9);
			b = nonZero(random, -15, 15);
			let top = (a - c) * nonZero(random, -10, 10);
			while (difficulty === 3 && top % (a - c) === 0) top = nonZero(random, -30, 30);
			d = top + b;
		}
		const { answer, tex } = solution(d - b, a - c);
		return calculation(
			`Résous l'équation $${poly([a, b])} = ${poly([c, d])}$. ${ASK_X}`,
			answer,
			`On regroupe les $x$ d'un côté et les nombres de l'autre : $${poly([a, 0])} - ${paren(poly([c, 0]))} = ${d} - ${paren(b)}$, soit $${poly([a - c, 0])} = ${d - b}$, donc $x = ${tex}$.`
		);
	}
};

const algebraExpand: Generator = {
	id: 'algebra.expand',
	family: 'algebra',
	grades: ['4e', '3e'],
	label:
		'QCM : développer ; 1 : k(x + b), 2 : k(ax + b) avec des négatifs, 3 : double distributivité (ax + b)(cx + d)',
	generate(random, { difficulty }) {
		if (difficulty === 3) {
			const [a, c] = [int(random, 1, 3), int(random, 1, 3)];
			const [b, d] = [nonZero(random, -9, 9), nonZero(random, -9, 9)];
			const answer = polyExpr([a * c, a * d + b * c, b * d]);
			const written = termsTex([
				[a * c, 2],
				[a * d, 1],
				[b * c, 1],
				[b * d, 0]
			]);
			return exprMcq(
				`Développe et réduis : $${product(lin(a, b), lin(c, d)).tex}$`,
				answer,
				[
					polyExpr([a * c, 0, b * d]),
					polyExpr([a * c, a * d - b * c, b * d]),
					polyExpr([a * c, a * d + b * c, -b * d]),
					polyExpr([a * c, a * d + b * c, b + d]),
					polyExpr([a * c, -(a * d + b * c), b * d]),
					polyExpr([0, a + c, b * d])
				],
				`Chaque terme de la première parenthèse multiplie chaque terme de la seconde : $${written} = ${answer.tex}$.`
			);
		}
		const k =
			difficulty === 1
				? int(random, 2, 9)
				: pick(random, [-1, -2, -3, -4, -5, -6, 2, 3, 4, 5, 6, 7]);
		const a = difficulty === 1 ? 1 : nonZero(random, -5, 5);
		const b = difficulty === 1 ? int(random, 1, 9) : nonZero(random, -9, 9);
		const answer = lin(k * a, k * b);
		return exprMcq(
			`Développe : $${factor(k, lin(a, b)).tex}$`,
			answer,
			[lin(k * a, b), lin(a, k * b), lin(k * a, -k * b), lin(-k * a, k * b), lin(k * a, k + b)],
			`On multiplie $${paren(k)}$ par chaque terme de la parenthèse : $${paren(k)} \\times ${paren(poly([a, 0]))} + ${paren(k)} \\times ${paren(b)} = ${answer.tex}$.`
		);
	}
};

/** bx written for an explanation: x, 3x, (3x) when squared. */
const termX = (b: number) => poly([b, 0]);
const squareOf = (b: number) => (b === 1 ? 'x^{2}' : `(${termX(b)})^{2}`);

const algebraIdentities: Generator = {
	id: 'algebra.identities',
	family: 'algebra',
	grades: ['3e'],
	label:
		'QCM : développer avec une identité remarquable (a + b)², (a − b)², (a + b)(a − b) ; 1 : x et un entier, 2–3 : coefficient devant x',
	generate(random, { difficulty }) {
		const b =
			difficulty === 1 ? 1 : int(random, difficulty === 2 ? 1 : 2, difficulty === 2 ? 3 : 5);
		const a = int(random, 1, 9);
		const kind = pick(random, ['plus', 'minus', 'difference'] as const);
		const [bb, ab2, aa] = [b * b, 2 * a * b, a * a];
		if (kind === 'plus') {
			return exprMcq(
				`Développe : $${squared(lin(b, a)).tex}$`,
				polyExpr([bb, ab2, aa]),
				[
					polyExpr([bb, 0, aa]),
					polyExpr([bb, a * b, aa]),
					polyExpr([b, ab2, aa]),
					polyExpr([bb, -ab2, aa]),
					polyExpr([bb, ab2, 2 * a])
				],
				`$(a + b)^{2} = a^{2} + 2ab + b^{2}$ : $${squareOf(b)} + 2 \\times ${termX(b)} \\times ${a} + ${a}^{2} = ${poly([bb, ab2, aa])}$.`
			);
		}
		if (kind === 'minus') {
			return exprMcq(
				`Développe : $${squared(lin(b, -a)).tex}$`,
				polyExpr([bb, -ab2, aa]),
				[
					polyExpr([bb, 0, -aa]),
					polyExpr([bb, 0, aa]),
					polyExpr([bb, -ab2, -aa]),
					polyExpr([bb, -a * b, aa]),
					polyExpr([bb, ab2, aa])
				],
				`$(a - b)^{2} = a^{2} - 2ab + b^{2}$ : $${squareOf(b)} - 2 \\times ${termX(b)} \\times ${a} + ${a}^{2} = ${poly([bb, -ab2, aa])}$.`
			);
		}
		return exprMcq(
			`Développe : $${product(lin(b, a), lin(b, -a)).tex}$`,
			polyExpr([bb, 0, -aa]),
			[
				polyExpr([bb, 0, aa]),
				polyExpr([bb, -ab2, aa]),
				polyExpr([bb, ab2, -aa]),
				polyExpr([b, 0, -aa]),
				polyExpr([bb, 0, -2 * a])
			],
			`$(a + b)(a - b) = a^{2} - b^{2}$ : $${squareOf(b)} - ${a}^{2} = ${poly([bb, 0, -aa])}$.`
		);
	}
};

/** Two coprime numbers (the bracket left after taking out the common factor). */
function coprimePair(random: Random, max: number): [number, number] {
	for (;;) {
		const [p, q] = [int(random, 1, max), nonZero(random, -max, max)];
		if (gcd(p, q) === 1) return [p, q];
	}
}

const algebraFactor: Generator = {
	id: 'algebra.factor',
	family: 'algebra',
	grades: ['4e', '3e'],
	label:
		'QCM : factoriser ; 1 : facteur commun numérique, 2 : facteur commun avec x, 3 : identités remarquables (3e)',
	generate(random, { difficulty }) {
		if (difficulty === 1) {
			const k = int(random, 2, 9);
			const [p, q] = coprimePair(random, 9);
			const answer = factor(k, lin(p, q));
			return exprMcq(
				`Factorise : $${poly([k * p, k * q])}$`,
				answer,
				[
					factor(k, lin(p, k * q)),
					factor(k, lin(p, -q)),
					factor(k * p, lin(1, q)),
					factor(k, polyExpr([p + q]), true),
					factor(p, lin(k, q))
				],
				`$${k}$ est un facteur commun : $${poly([k * p, k * q])} = ${k} \\times ${paren(poly([p, 0]))} + ${k} \\times ${paren(q)} = ${answer.tex}$.`
			);
		}
		if (difficulty === 2) {
			const g = int(random, 1, 6);
			const [p, q] = coprimePair(random, 5);
			const answer = factor(g, lin(p, q), true);
			const expanded = poly([g * p, g * q, 0]);
			return exprMcq(
				`Factorise le plus possible : $${expanded}$`,
				answer,
				[
					factor(g, polyExpr([p, q, 0]), true),
					factor(g, polyExpr([p, 0, q])),
					factor(g, lin(p, -q), true),
					factor(g, lin(p, q * g), true),
					{ tex: `${g === 1 ? '' : g}x^{2}(${poly([p + q])})`, at: (x) => g * x * x * (p + q) }
				],
				`$${g === 1 ? 'x' : `${g}x`}$ est un facteur commun : $${expanded} = ${answer.tex}$.`
			);
		}
		const b = int(random, 1, 3);
		let a = int(random, 1, 9);
		while (gcd(a, b) !== 1) a = int(random, 1, 9); // fully factorised: no common factor left
		const kind = pick(random, ['difference', 'plus', 'minus'] as const);
		const [bb, ab2, aa] = [b * b, 2 * a * b, a * a];
		if (kind === 'difference') {
			return exprMcq(
				`Factorise : $${poly([bb, 0, -aa])}$`,
				product(lin(b, -a), lin(b, a)),
				[
					squared(lin(b, -a)),
					squared(lin(b, a)),
					product(lin(-b, a), lin(b, a)),
					product(lin(b, -aa), lin(b, aa))
				],
				`$a^{2} - b^{2} = (a - b)(a + b)$ avec $a = ${termX(b)}$ et $b = ${a}$.`
			);
		}
		const sign = kind === 'plus' ? 1 : -1;
		return exprMcq(
			`Factorise : $${poly([bb, sign * ab2, aa])}$`,
			squared(lin(b, sign * a)),
			[
				squared(lin(b, -sign * a)),
				squared(lin(b, sign * 2 * a)),
				product(lin(b, a), lin(b, -a)),
				squared(lin(b, sign * aa))
			],
			`$a^{2} ${sign > 0 ? '+' : '-'} 2ab + b^{2} = (a ${sign > 0 ? '+' : '-'} b)^{2}$ avec $a = ${termX(b)}$ et $b = ${a}$.`
		);
	}
};

export const algebraGenerators: Generator[] = [
	equationsLinear,
	equationsBothSides,
	algebraExpand,
	algebraIdentities,
	algebraFactor
];
