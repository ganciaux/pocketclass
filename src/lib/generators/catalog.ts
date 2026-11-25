import type { Grade } from '#lib/data/types.ts';
import { calculationGenerators } from './calculation.ts';
import type { Generator } from './types.ts';

/** Every generator a sheet may name, by id. */
export const GENERATORS: readonly Generator[] = [...calculationGenerators];

const byId = new Map(GENERATORS.map((g) => [g.id, g]));

export const generatorById = (id: string) => byId.get(id);

/** The generators offered for a grade (AI prompt). */
export const generatorsForGrade = (grade: Grade | string) =>
	GENERATORS.filter((g) => (g.grades as readonly string[]).includes(grade));
