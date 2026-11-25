import { allowed, calculation, trueFalse } from './build.ts';
import { decimal, round, tex } from './format.ts';
import { chance, int, pick } from './random.ts';
import type { Difficulty, Generator, Random } from './types.ts';

// Family « Géométrie »: perimeters, areas, volumes, Pythagoras. With π or a square root the
// statement asks for a value rounded to the tenth, and the answer is that rounded value.

const LENGTHS = ['mm', 'cm', 'm'] as const;
const ROUNDED = ', arrondi au dixième';

/** A length: an integer at difficulty 1, else sometimes one decimal (kept exact in tenths). */
function length(random: Random, difficulty: Difficulty, min = 2, max = 20): number {
	if (difficulty === 1 || chance(random, 0.5)) return int(random, min, max);
	return int(random, min * 10 + 1, max * 10) / 10;
}

const n = (value: number) => tex(decimal(value));
const answerOf = (value: number) => decimal(value);
const approx = (value: number) => tex(decimal(round(value, 1)));

/** Shapes from the `shapes` param, else those of the difficulty. */
function shapesFor<T extends string>(
	params: Record<string, unknown>,
	all: readonly T[],
	byDifficulty: readonly (readonly T[])[],
	difficulty: Difficulty
): readonly T[] {
	return Array.isArray(params.shapes)
		? allowed(params, 'shapes', all)
		: byDifficulty[difficulty - 1];
}

const PERIMETER_SHAPES = ['square', 'rectangle', 'triangle', 'circle'] as const;

const geometryPerimeter: Generator = {
	id: 'geometry.perimeter',
	family: 'geometry',
	grades: ['6e', '5e', '4e', '3e'],
	label: 'périmètre ; 1 : carré, rectangle, 2 : avec décimaux et triangle, 3 : cercle (arrondi)',
	params: `"shapes" : liste parmi ${PERIMETER_SHAPES.join(', ')}`,
	generate(random, { difficulty, params }) {
		const shape = pick(
			random,
			shapesFor(
				params,
				PERIMETER_SHAPES,
				[
					['square', 'rectangle'],
					['square', 'rectangle', 'triangle'],
					['rectangle', 'triangle', 'circle']
				],
				difficulty
			)
		);
		const unit = pick(random, LENGTHS);
		const ask = `Calcule son périmètre, en ${unit}`;
		if (shape === 'square') {
			const c = length(random, difficulty);
			return calculation(
				`Un carré a des côtés de $${n(c)}$ ${unit}. ${ask}.`,
				answerOf(4 * c),
				`$P = 4 \\times ${n(c)} = ${n(4 * c)}$ ${unit}.`
			);
		}
		if (shape === 'rectangle') {
			const w = length(random, difficulty, 2, 15);
			const l = w + length(random, difficulty, 1, 15);
			return calculation(
				`Un rectangle mesure $${n(l)}$ ${unit} de long et $${n(w)}$ ${unit} de large. ${ask}.`,
				answerOf(2 * (l + w)),
				`$P = 2 \\times (${n(l)} + ${n(w)}) = ${n(2 * (l + w))}$ ${unit}.`
			);
		}
		if (shape === 'triangle') {
			const a = length(random, difficulty, 3, 15);
			const b = length(random, difficulty, 3, 15);
			const c = round(Math.abs(a - b) + 1 + random() * (Math.min(a, b) - 1), 0);
			return calculation(
				`Un triangle a des côtés de $${n(a)}$ ${unit}, $${n(b)}$ ${unit} et $${n(c)}$ ${unit}. ${ask}.`,
				answerOf(a + b + c),
				`$P = ${n(a)} + ${n(b)} + ${n(c)} = ${n(a + b + c)}$ ${unit}.`
			);
		}
		const r = int(random, 1, 15);
		const diameter = chance(random);
		const value = 2 * Math.PI * r;
		return calculation(
			`Un cercle a un ${diameter ? `diamètre de $${2 * r}$` : `rayon de $${r}$`} ${unit}. Calcule sa longueur, en ${unit}${ROUNDED}.`,
			answerOf(round(value, 1)),
			`$L = ${diameter ? `\\pi \\times ${2 * r}` : `2 \\times \\pi \\times ${r}`} \\approx ${approx(value)}$ ${unit}.`
		);
	}
};

const AREA_SHAPES = [
	'square',
	'rectangle',
	'triangle',
	'right_triangle',
	'parallelogram',
	'disc'
] as const;

const geometryArea: Generator = {
	id: 'geometry.area',
	family: 'geometry',
	grades: ['6e', '5e', '4e', '3e'],
	label:
		'aire ; 1 : carré, rectangle, 2 : triangles et parallélogramme, 3 : disque (arrondi) et décimaux',
	params: `"shapes" : liste parmi ${AREA_SHAPES.join(', ')}`,
	generate(random, { difficulty, params }) {
		const shape = pick(
			random,
			shapesFor(
				params,
				AREA_SHAPES,
				[
					['square', 'rectangle'],
					['triangle', 'right_triangle', 'parallelogram'],
					['triangle', 'parallelogram', 'disc']
				],
				difficulty
			)
		);
		const unit = pick(random, LENGTHS);
		const ask = `Calcule son aire, en ${unit}²`;
		const d: Difficulty = difficulty === 3 ? 3 : 1; // decimals at difficulty 3 only
		if (shape === 'square') {
			const c = length(random, d);
			return calculation(
				`Un carré a des côtés de $${n(c)}$ ${unit}. ${ask}.`,
				answerOf(c * c),
				`$A = ${n(c)} \\times ${n(c)} = ${n(c * c)}$ ${unit}².`
			);
		}
		if (shape === 'rectangle') {
			const w = length(random, d, 2, 12);
			const l = w + int(random, 1, 10);
			return calculation(
				`Un rectangle mesure $${n(l)}$ ${unit} de long et $${n(w)}$ ${unit} de large. ${ask}.`,
				answerOf(l * w),
				`$A = ${n(l)} \\times ${n(w)} = ${n(l * w)}$ ${unit}².`
			);
		}
		if (shape === 'triangle' || shape === 'right_triangle') {
			const b = length(random, d, 2, 16);
			const h = int(random, 2, 12);
			const what =
				shape === 'triangle'
					? `Un triangle a une base de $${n(b)}$ ${unit} et une hauteur relative à cette base de $${h}$ ${unit}.`
					: `Un triangle rectangle a des côtés de l'angle droit de $${n(b)}$ ${unit} et $${h}$ ${unit}.`;
			return calculation(
				`${what} ${ask}.`,
				answerOf((b * h) / 2),
				`$A = \\frac{${n(b)} \\times ${h}}{2} = ${n((b * h) / 2)}$ ${unit}².`
			);
		}
		if (shape === 'parallelogram') {
			const b = length(random, d, 2, 15);
			const h = int(random, 2, 12);
			return calculation(
				`Un parallélogramme a une base de $${n(b)}$ ${unit} et une hauteur relative de $${h}$ ${unit}. ${ask}.`,
				answerOf(b * h),
				`$A = ${n(b)} \\times ${h} = ${n(b * h)}$ ${unit}².`
			);
		}
		const r = int(random, 1, 12);
		const value = Math.PI * r * r;
		return calculation(
			`Un disque a un rayon de $${r}$ ${unit}. ${ask}${ROUNDED}.`,
			answerOf(round(value, 1)),
			`$A = \\pi \\times ${r}^{2} \\approx ${approx(value)}$ ${unit}².`
		);
	}
};

const VOLUME_SHAPES = ['cube', 'cuboid', 'cylinder', 'pyramid', 'cone', 'sphere'] as const;

const geometryVolume: Generator = {
	id: 'geometry.volume',
	family: 'geometry',
	grades: ['6e', '5e', '4e', '3e'],
	label:
		'volume ; 1 : cube, pavé droit, 2 : cylindre (arrondi), pyramide, 3 : cône, boule (arrondis)',
	params: `"shapes" : liste parmi ${VOLUME_SHAPES.join(', ')} (pyramide à base carrée)`,
	generate(random, { difficulty, params }) {
		const shape = pick(
			random,
			shapesFor(
				params,
				VOLUME_SHAPES,
				[
					['cube', 'cuboid'],
					['cuboid', 'cylinder', 'pyramid'],
					['cylinder', 'cone', 'sphere']
				],
				difficulty
			)
		);
		const unit = pick(random, ['cm', 'dm', 'm'] as const);
		const ask = `Calcule son volume, en ${unit}³`;
		if (shape === 'cube') {
			const c = int(random, 2, 12);
			return calculation(
				`Un cube a des arêtes de $${c}$ ${unit}. ${ask}.`,
				String(c ** 3),
				`$V = ${c} \\times ${c} \\times ${c} = ${tex(c ** 3)}$ ${unit}³.`
			);
		}
		if (shape === 'cuboid') {
			const [l, w, h] = [int(random, 3, 15), int(random, 2, 10), int(random, 2, 10)];
			return calculation(
				`Un pavé droit mesure $${l}$ ${unit} de long, $${w}$ ${unit} de large et $${h}$ ${unit} de haut. ${ask}.`,
				String(l * w * h),
				`$V = ${l} \\times ${w} \\times ${h} = ${tex(l * w * h)}$ ${unit}³.`
			);
		}
		if (shape === 'pyramid') {
			const [c, h] = [int(random, 2, 12), 3 * int(random, 1, 6)];
			const v = (c * c * h) / 3;
			return calculation(
				`Une pyramide a une base carrée de côté $${c}$ ${unit} et une hauteur de $${h}$ ${unit}. ${ask}.`,
				String(v),
				`$V = \\frac{\\text{aire de la base} \\times \\text{hauteur}}{3} = \\frac{${c}^{2} \\times ${h}}{3} = ${tex(v)}$ ${unit}³.`
			);
		}
		const r = int(random, 1, 10);
		const h = int(random, 2, 15);
		if (shape === 'sphere') {
			const value = (4 / 3) * Math.PI * r ** 3;
			return calculation(
				`Une boule a un rayon de $${r}$ ${unit}. ${ask}${ROUNDED}.`,
				answerOf(round(value, 1)),
				`$V = \\frac{4}{3} \\times \\pi \\times ${r}^{3} \\approx ${approx(value)}$ ${unit}³.`
			);
		}
		const cone = shape === 'cone';
		const value = (Math.PI * r * r * h) / (cone ? 3 : 1);
		return calculation(
			`Un ${cone ? 'cône de révolution' : 'cylindre'} a un rayon de base de $${r}$ ${unit} et une hauteur de $${h}$ ${unit}. ${ask}${ROUNDED}.`,
			answerOf(round(value, 1)),
			`$V = ${cone ? '\\frac{\\pi \\times ' + r + '^{2} \\times ' + h + '}{3}' : `\\pi \\times ${r}^{2} \\times ${h}`} \\approx ${approx(value)}$ ${unit}³.`
		);
	}
};

const TRIPLES = [
	[3, 4, 5],
	[5, 12, 13],
	[8, 15, 17],
	[7, 24, 25],
	[20, 21, 29]
] as const;

/** BC = √value, exact when it is a square. */
function root(square: number): { exact: boolean; value: number } {
	const value = Math.sqrt(square);
	return { exact: Number.isInteger(value), value };
}

const geometryPythagoras: Generator = {
	id: 'geometry.pythagoras',
	family: 'geometry',
	grades: ['4e', '3e'],
	label:
		'théorème de Pythagore ; 1 : hypoténuse entière, 2 : hypoténuse ou côté (arrondi), 3 : côté de l’angle droit ou vrai/faux de la réciproque',
	generate(random, { difficulty }) {
		const unit = pick(random, ['cm', 'm'] as const);
		if (difficulty === 3 && chance(random, 0.35)) {
			const k = int(random, 1, 3);
			const [a, b, c] = pick(random, TRIPLES).map((x) => x * k);
			const right = chance(random);
			const longest = right ? c : c + pick(random, [-1, 1]);
			const [sum, square] = [a * a + b * b, longest * longest];
			return trueFalse(
				`Un triangle a des côtés de $${a}$ ${unit}, $${b}$ ${unit} et $${longest}$ ${unit}. Il est rectangle.`,
				right,
				`$${longest}^{2} = ${tex(square)}$ et $${a}^{2} + ${b}^{2} = ${tex(a * a)} + ${tex(b * b)} = ${tex(sum)}$ : ${right ? 'égalité, donc il est rectangle (réciproque du théorème de Pythagore)' : `$${tex(square)} \\neq ${tex(sum)}$, donc il n'est pas rectangle`}.`
			);
		}
		const findLeg = difficulty === 3 || (difficulty === 2 && chance(random));
		let [a, b, c]: number[] = [];
		if (difficulty === 1 || chance(random, 0.3)) {
			const k = int(random, 1, difficulty === 1 ? 3 : 4);
			[a, b, c] = pick(random, TRIPLES).map((x) => x * k);
		} else {
			[a, b] = [int(random, 2, 15), int(random, 2, 15)];
			c = Math.sqrt(a * a + b * b);
		}
		const intro = `Le triangle $ABC$ est rectangle en $A$`;
		if (!findLeg) {
			const r = root(a * a + b * b);
			return calculation(
				`${intro}, avec $AB = ${a}$ ${unit} et $AC = ${b}$ ${unit}. Calcule $BC$, en ${unit}${r.exact ? '' : ROUNDED}.`,
				answerOf(round(r.value, 1)),
				`D'après le théorème de Pythagore, $BC^{2} = AB^{2} + AC^{2} = ${a * a} + ${b * b} = ${a * a + b * b}$, donc $BC = \\sqrt{${a * a + b * b}} ${r.exact ? '=' : '\\approx'} ${r.exact ? r.value : approx(r.value)}$ ${unit}.`
			);
		}
		// Find a leg: the hypotenuse must be a known (integer) length.
		const hyp = Number.isInteger(c) ? c : Math.ceil(c);
		const r = root(hyp * hyp - a * a);
		return calculation(
			`${intro}, avec $BC = ${hyp}$ ${unit} et $AB = ${a}$ ${unit}. Calcule $AC$, en ${unit}${r.exact ? '' : ROUNDED}.`,
			answerOf(round(r.value, 1)),
			`D'après le théorème de Pythagore, $AC^{2} = BC^{2} - AB^{2} = ${hyp * hyp} - ${a * a} = ${hyp * hyp - a * a}$, donc $AC = \\sqrt{${hyp * hyp - a * a}} ${r.exact ? '=' : '\\approx'} ${r.exact ? r.value : approx(r.value)}$ ${unit}.`
		);
	}
};

export const geometryGenerators: Generator[] = [
	geometryPerimeter,
	geometryArea,
	geometryVolume,
	geometryPythagoras
];
