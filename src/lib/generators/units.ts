import { allowed, calculation, trueFalse } from './build.ts';
import { decimal, scaled, tex } from './format.ts';
import { chance, int, pick } from './random.ts';
import type { Difficulty, Generator, Random } from './types.ts';

// Family « Conversions »: each unit is a power of ten of a base unit, so a conversion shifts
// the comma; values are built as digits × 10^k and written exactly (`scaled`).

/** Unit → power of ten of the base unit (m, g, L, m², m³). */
type UnitTable = Record<string, number>;

export const TABLES = {
	length: { km: 3, hm: 2, dam: 1, m: 0, dm: -1, cm: -2, mm: -3 },
	mass: { t: 6, kg: 3, hg: 2, dag: 1, g: 0, dg: -1, cg: -2, mg: -3 },
	capacity: { hL: 2, daL: 1, L: 0, dL: -1, cL: -2, mL: -3 },
	area: { 'km²': 6, 'hm²': 4, ha: 4, 'dam²': 2, a: 2, 'm²': 0, 'dm²': -2, 'cm²': -4, 'mm²': -6 },
	volume: {
		'm³': 0,
		hL: -1,
		'dm³': -3,
		L: -3,
		dL: -4,
		cL: -5,
		'cm³': -6,
		mL: -6,
		'mm³': -9
	}
} satisfies Record<string, UnitTable>;

/** How far apart two units are, in steps of the table (km → m: 3 for lengths). */
function distance(table: UnitTable, from: string, to: string): number {
	const powers = [...new Set(Object.values(table))].sort((a, b) => b - a);
	return Math.abs(powers.indexOf(table[from]) - powers.indexOf(table[to]));
}

/** A pair of units for the difficulty: close and towards the smaller unit first. */
function unitPair(random: Random, table: UnitTable, units: string[], difficulty: Difficulty) {
	const pairs = units.flatMap((from) =>
		units.filter((to) => table[to] !== table[from]).map((to) => [from, to] as const)
	);
	const fits = pairs.filter(([from, to]) =>
		difficulty === 1
			? table[from] > table[to] && distance(table, from, to) <= 2
			: difficulty === 2
				? distance(table, from, to) <= 3
				: true
	);
	return pick(random, fits.length > 0 ? fits : pairs);
}

function converter(
	id: string,
	table: UnitTable,
	label: string,
	grades: Generator['grades']
): Generator {
	const all = Object.keys(table);
	return {
		id,
		family: 'units',
		grades,
		label,
		params: `"units" : liste d'au moins 2 unités parmi ${all.join(', ')}`,
		generate(random, { difficulty, params }) {
			const [from, to] = unitPair(random, table, allowed(params, 'units', all, 2), difficulty);
			const decimals = difficulty === 1 ? 0 : int(random, 0, difficulty === 2 ? 1 : 2);
			let digits = int(random, decimals > 0 ? 11 : 1, decimals > 0 ? 999 : 99);
			while (decimals > 0 && digits % 10 === 0) digits = int(random, 11, 999);
			const shift = table[from] - table[to];
			const value = scaled(digits, -decimals);
			const answer = scaled(digits, shift - decimals);
			return calculation(
				`Convertis $${tex(value)}$ ${from} en ${to}.`,
				answer,
				`$1$ ${from} $= ${tex(scaled(1, shift))}$ ${to}, donc $${tex(value)}$ ${from} $= ${tex(answer)}$ ${to}.`
			);
		}
	};
}

const SIX_TO_THREE = ['6e', '5e', '4e', '3e'] as const;

/** Hours and minutes: "2 h 15 min". */
const hm = (h: number, m: number) => `$${h}$ h${m ? ` $${m}$ min` : ''}`;

const unitsDuration: Generator = {
	id: 'units.duration',
	family: 'units',
	grades: SIX_TO_THREE,
	label:
		'durées ; 1 : h → min, min → s, jours → h, 2 : h min → min et heures décimales → min, 3 : min → heures décimales, vrai/faux du piège 1,5 h = 1 h 50 min',
	generate(random, { difficulty }) {
		if (difficulty === 1) {
			const [from, to, factor] = pick(random, [
				['h', 'min', 60],
				['min', 's', 60],
				['j', 'h', 24]
			] as const);
			const v = int(random, 2, factor === 24 ? 7 : 10);
			return calculation(
				`Convertis $${v}$ ${from} en ${to}.`,
				String(v * factor),
				`$1$ ${from} $= ${factor}$ ${to}, donc $${v}$ ${from} $= ${v} \\times ${factor} = ${v * factor}$ ${to}.`
			);
		}
		if (difficulty === 2) {
			const h = int(random, 1, 5);
			if (chance(random)) {
				const m = int(random, 1, 11) * 5;
				return calculation(
					`Convertis ${hm(h, m)} en min.`,
					String(h * 60 + m),
					`$${h}$ h $= ${h} \\times 60 = ${h * 60}$ min, donc ${hm(h, m)} $= ${h * 60} + ${m} = ${h * 60 + m}$ min.`
				);
			}
			const quarter = pick(random, [0.25, 0.5, 0.75]);
			const hours = tex(decimal(h + quarter));
			return calculation(
				`Convertis $${hours}$ h en min.`,
				String((h + quarter) * 60),
				`$${tex(decimal(quarter))}$ h $= ${tex(decimal(quarter))} \\times 60 = ${quarter * 60}$ min, donc $${hours}$ h $= ${h * 60} + ${quarter * 60} = ${(h + quarter) * 60}$ min.`
			);
		}
		const h = int(random, 1, 4);
		const tenths = int(random, 1, 9);
		const m = tenths * 6;
		const hours = decimal(h + tenths / 10);
		if (chance(random, 0.4)) {
			// The classic mistake: reading the decimals of an hour as minutes.
			const right = chance(random);
			const shown = right ? m : tenths * 10;
			return trueFalse(
				`$${tex(hours)}$ h $=$ ${hm(h, shown)}`,
				shown === m,
				`Une heure fait $60$ min, pas $100$ : $0{,}${tenths}$ h $= 0{,}${tenths} \\times 60 = ${m}$ min, donc $${tex(hours)}$ h $=$ ${hm(h, m)}.`
			);
		}
		return calculation(
			`Convertis ${hm(h, m)} en heures (nombre décimal).`,
			hours,
			`$${m}$ min $= \\frac{${m}}{60}$ h $= 0{,}${tenths}$ h, donc ${hm(h, m)} $= ${tex(hours)}$ h.`
		);
	}
};

export const unitsGenerators: Generator[] = [
	converter('units.length', TABLES.length, 'convertir des longueurs (km … mm)', SIX_TO_THREE),
	converter('units.mass', TABLES.mass, 'convertir des masses (t, kg … mg)', SIX_TO_THREE),
	converter('units.capacity', TABLES.capacity, 'convertir des contenances (hL … mL)', SIX_TO_THREE),
	converter('units.area', TABLES.area, 'convertir des aires (km², ha, a, m² … mm²)', SIX_TO_THREE),
	converter(
		'units.volume',
		TABLES.volume,
		'convertir des volumes et contenances (m³, dm³ = L, cm³ = mL …)',
		SIX_TO_THREE
	),
	unitsDuration
];
