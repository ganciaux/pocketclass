import type { Random } from './types.ts';

/** Deterministic random numbers (mulberry32), for tests and reproducible draws. */
export function seeded(seed = 1): Random {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** Integer in [min, max]. */
export const int = (random: Random, min: number, max: number) =>
	min + Math.floor(random() * (max - min + 1));

export const pick = <T>(random: Random, items: readonly T[]): T =>
	items[Math.floor(random() * items.length)];

export const chance = (random: Random, probability = 0.5) => random() < probability;

/** Integer in [min, max], never 0. */
export function nonZero(random: Random, min: number, max: number): number {
	for (;;) {
		const n = int(random, min, max);
		if (n !== 0) return n;
	}
}
