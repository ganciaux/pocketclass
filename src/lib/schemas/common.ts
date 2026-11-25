import { z } from 'zod';
import { generatorById } from '#lib/generators/catalog.ts';
import { fr } from '#lib/i18n/fr.ts';

const SLUG = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;
const NUMBER_OR_FRACTION = /^-?\d+(?:[.,]\d+)?$|^-?\d+\s*\/\s*-?\d+$/;
const CLOZE_BLANK = /\[\[(.*?)\]\]/g;

export const slug = z.string().regex(SLUG, { error: fr.validation.slug });
export const text = z.string().trim().min(1);

export const USAGES = ['practice', 'assessment'] as const;
export const ASSESSMENT_TYPES = ['brevet', 'test'] as const;

const difficulty = z.literal([1, 2, 3]).default(1);

const clozeText = text.superRefine((value, ctx) => {
	const blanks = [...value.matchAll(CLOZE_BLANK)].map((m) => m[1]);
	if (blanks.length === 0) ctx.addIssue({ code: 'custom', message: fr.validation.clozeNoBlank });
	if (blanks.some((b) => b.trim() === ''))
		ctx.addIssue({ code: 'custom', message: fr.validation.clozeEmptyBlank });
});

/** Type-specific fields of each exercise kind (the `type` discriminant included). */
const exerciseVariants = {
	pair: {
		type: z.literal('pair'),
		front: text,
		back: text,
		direction: z.enum(['front_to_back', 'both']).default('front_to_back')
	},
	mcq: {
		type: z.literal('mcq'),
		question: text,
		answer: text,
		distractors: z
			.array(text)
			.length(3)
			.superRefine((distractors, ctx) => uniqueTexts(distractors, ctx))
	},
	calculation: {
		type: z.literal('calculation'),
		statement: text,
		answer: z.union([
			z.number(),
			z.string().trim().regex(NUMBER_OR_FRACTION, { error: fr.validation.numberOrFraction })
		]),
		requireIrreducible: z.boolean().optional()
	},
	cloze: {
		type: z.literal('cloze'),
		text: clozeText
	},
	ordering: {
		type: z.literal('ordering'),
		instruction: text,
		items: z.array(text).min(2)
	},
	open: {
		type: z.literal('open'),
		question: text,
		answers: z.array(text).min(1)
	},
	paper: {
		type: z.literal('paper'),
		instruction: text,
		answer: z.string().optional(),
		answerFormat: z.enum(['number', 'fraction', 'text', 'none']).optional()
	},
	generator: {
		type: z.literal('generator'),
		generator: text.refine((id) => generatorById(id) !== undefined, {
			error: (issue) => fr.validation.unknownGenerator(String(issue.input))
		}),
		params: z.record(z.string(), z.unknown()).default({})
	},
	match: {
		type: z.literal('match'),
		instruction: text.optional(),
		pairs: z
			.array(z.object({ left: text, right: text }))
			.min(2)
			.max(6)
			.superRefine((pairs, ctx) => {
				uniqueValues(pairs, 'left', ctx);
				uniqueValues(pairs, 'right', ctx);
			})
	},
	true_false: {
		type: z.literal('true_false'),
		statement: text,
		answer: z.boolean()
	},
	categorize: {
		type: z.literal('categorize'),
		instruction: text.optional(),
		categories: z
			.array(text)
			.min(2)
			.max(4)
			.superRefine((categories, ctx) => uniqueTexts(categories, ctx)),
		items: z.array(z.object({ text, category: text })).min(2)
	}
} as const;

/** Each text once (categories, distractors): the player could not tell twins apart. */
function uniqueTexts(values: string[], ctx: z.RefinementCtx): void {
	values.forEach((value, index) => {
		if (values.indexOf(value) !== index) {
			ctx.addIssue({ code: 'custom', path: [index], message: fr.validation.duplicateValue(value) });
		}
	});
}

/** A match pair side must appear once, or the player could not tell the pairs apart. */
function uniqueValues(
	pairs: { left: string; right: string }[],
	side: 'left' | 'right',
	ctx: z.RefinementCtx
): void {
	const seen = new Set<string>();
	pairs.forEach((pair, index) => {
		if (seen.has(pair[side])) {
			ctx.addIssue({
				code: 'custom',
				path: [index, side],
				message: fr.validation.duplicateValue(pair[side])
			});
		}
		seen.add(pair[side]);
	});
}

type CategorizeFields = { categories: string[]; items: { category: string }[] };

/** Every item of a categorize exercise goes into one of its categories. */
function checkCategories(exercise: CategorizeFields, ctx: z.RefinementCtx): void {
	const known = new Set(exercise.categories);
	exercise.items.forEach((item, index) =>
		checkRef(item.category, known, 'categories', ['items', index, 'category'], ctx)
	);
}

/** Common optional field: one sentence shown after the answer (learn from a mistake). */
const explanation = text.optional();

export const EXERCISE_TYPES = Object.keys(exerciseVariants) as (keyof typeof exerciseVariants)[];

/**
 * Builds the exercise union for a given set of common fields, so sheets (strict ids) and
 * `lesson@1` (optional ids) share the same type-specific definitions.
 */
function exerciseUnion<Base extends z.ZodRawShape>(base: Base) {
	const v = exerciseVariants;
	return z.discriminatedUnion('type', [
		z.object({ ...base, ...v.pair }),
		z.object({ ...base, ...v.mcq }).superRefine((exercise, ctx) => {
			// A distractor equal to the answer would be a right answer marked wrong.
			const e = exercise as { answer: string; distractors: string[] };
			const index = e.distractors.indexOf(e.answer);
			if (index !== -1) {
				ctx.addIssue({
					code: 'custom',
					path: ['distractors', index],
					message: fr.validation.duplicateValue(e.answer)
				});
			}
		}),
		z.object({ ...base, ...v.calculation }),
		z.object({ ...base, ...v.cloze }),
		z.object({ ...base, ...v.ordering }),
		z.object({ ...base, ...v.open }),
		z.object({ ...base, ...v.paper }),
		z.object({ ...base, ...v.generator }),
		z.object({ ...base, ...v.match }),
		z.object({ ...base, ...v.true_false }),
		// The generic `Base` hides the categorize fields from TypeScript here: state them.
		z
			.object({ ...base, ...v.categorize })
			.superRefine((exercise, ctx) => checkCategories(exercise as CategorizeFields, ctx))
	]);
}

export const exerciseSchema = exerciseUnion({
	id: slug,
	usage: z.enum(USAGES),
	keyPoint: slug,
	difficulty,
	explanation
});

export const lessonExerciseSchema = exerciseUnion({
	id: slug.optional(),
	usage: z.enum(USAGES).optional(),
	keyPoint: slug.optional(),
	difficulty,
	explanation
});

export type Exercise = z.infer<typeof exerciseSchema>;
export type ExerciseType = Exercise['type'];
export type LessonExercise = z.infer<typeof lessonExerciseSchema>;

/** Reports every id that appears more than once, at the path of its later occurrences. */
export function checkUniqueIds(
	items: { id?: string }[],
	path: (string | number)[],
	ctx: z.RefinementCtx
): void {
	const seen = new Set<string>();
	items.forEach((item, index) => {
		if (item.id === undefined) return;
		if (seen.has(item.id)) {
			ctx.addIssue({
				code: 'custom',
				path: [...path, index, 'id'],
				message: fr.validation.duplicateId(item.id)
			});
		}
		seen.add(item.id);
	});
}

/** Reports `id` at `path` if it is not in `known`. */
export function checkRef(
	id: string,
	known: Set<string>,
	where: string,
	path: (string | number)[],
	ctx: z.RefinementCtx
): void {
	if (!known.has(id)) {
		ctx.addIssue({ code: 'custom', path, message: fr.validation.unknownRef(id, where) });
	}
}
