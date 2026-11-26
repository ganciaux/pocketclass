import { z } from 'zod';
import { fr } from '#lib/i18n/fr.ts';
import {
	ASSESSMENT_TYPES,
	checkRef,
	checkUniqueIds,
	exerciseSchema,
	slug,
	text
} from './common.ts';

export const SHEET_FORMAT = 'pocketclass/sheet@1';

const keyPointSchema = z.object({ id: slug, label: text });

const sectionSchema = z.object({
	title: text,
	text: text,
	examples: z.array(z.object({ statement: text, solution: text })).default([]),
	keyPoints: z.array(slug),
	/** Short version of `text` (a few bullets), shown by the sheet's « Résumé » view. */
	summary: z.array(text.max(200)).min(1).max(5).optional()
});

const assessmentSchema = z.object({
	type: z.enum(ASSESSMENT_TYPES),
	// An assessment is saved with at most 100 answers (rules): 15 per key point × 6 is plenty.
	draw: z.object({ perKeyPoint: z.int().min(1).max(15) }).optional(),
	exerciseIds: z.array(slug).optional(),
	paper: z
		.object({
			instruction: text,
			rubric: z.array(z.object({ keyPoint: slug, criterion: text })).min(1)
		})
		.optional(),
	/** The parent's settings, in an exported backup (the AI prompt does not ask for them). */
	passRate: z.int().min(1).max(100).optional(),
	points: z.int().min(0).max(1000).optional()
});

/** Same tag whatever the case or accents (« Fractión » = « fraction »). */
const tagKey = (tag: string) =>
	tag
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase();

/** Keywords to find the sheet (written by the AI); duplicates are dropped, not reported. */
const tagsSchema = z
	.array(text.max(30))
	.max(10)
	.default([])
	.transform((tags) =>
		tags.filter((tag, i) => tags.findIndex((t) => tagKey(t) === tagKey(tag)) === i)
	);

/**
 * Mind map of the sheet (written by the AI): for some key points, 1 to 4 very short leaves
 * (a word, a formula, a pitfall). Optional: without it the app builds one from the sections.
 */
const mindMapSchema = z
	.array(z.object({ keyPoint: slug, leaves: z.array(text.max(60)).min(1).max(4) }))
	.max(8);

/** Data URL budget of a mind map picture (one Firestore document each, 1 MiB max). */
export const MAP_IMAGE_MAX_LENGTH = 700_000;
/** Mind map pictures per sheet (`data/mapImages.ts`, `MAP_IMAGE_SLOTS`). */
export const MAX_MAP_IMAGES = 3;

/** Pictures of the mind map added by the parent (in an exported backup, never from the AI). */
const mapImagesSchema = z
	.array(
		z
			.string()
			.max(MAP_IMAGE_MAX_LENGTH)
			.regex(/^data:image\/(webp|jpeg|png);base64,/, { error: fr.validation.imageDataUrl })
	)
	.max(MAX_MAP_IMAGES);

/** One revision sheet (a "concept"): key points, study sheet, exercises, assessment. */
export const sheetBodySchema = z.object({
	id: slug,
	title: text,
	tags: tagsSchema,
	prerequisites: z.array(slug).default([]),
	keyPoints: z.array(keyPointSchema).min(1).max(8),
	mindMap: mindMapSchema.optional(),
	mapImages: mapImagesSchema.optional(),
	sheet: z.object({
		sections: z.array(sectionSchema).min(1),
		pitfalls: z.array(text).default([])
	}),
	summaryInstruction: text.optional(),
	exercises: z.array(exerciseSchema),
	assessment: assessmentSchema.optional()
});

export type SheetDoc = z.infer<typeof sheetBodySchema>;
export type KeyPoint = z.infer<typeof keyPointSchema>;
export type SheetSection = z.infer<typeof sectionSchema>;
export type AssessmentDoc = z.infer<typeof assessmentSchema>;

/** Cross-references inside one sheet (key points, exercises), reported under `at`. */
export function checkSheet(sheet: SheetDoc, at: (string | number)[], ctx: z.RefinementCtx): void {
	checkUniqueIds(sheet.keyPoints, [...at, 'keyPoints'], ctx);
	checkUniqueIds(sheet.exercises, [...at, 'exercises'], ctx);

	const keyPointIds = new Set(sheet.keyPoints.map((k) => k.id));
	const exerciseIds = new Set(sheet.exercises.map((e) => e.id));
	const keyPoint = (id: string, path: (string | number)[]) =>
		checkRef(id, keyPointIds, 'keyPoints', [...at, ...path], ctx);

	sheet.sheet.sections.forEach((section, s) =>
		section.keyPoints.forEach((kp, k) => keyPoint(kp, ['sheet', 'sections', s, 'keyPoints', k]))
	);
	sheet.exercises.forEach((exercise, e) =>
		keyPoint(exercise.keyPoint, ['exercises', e, 'keyPoint'])
	);
	const branches = new Set<string>();
	sheet.mindMap?.forEach((branch, b) => {
		const path = [...at, 'mindMap', b, 'keyPoint'];
		keyPoint(branch.keyPoint, ['mindMap', b, 'keyPoint']);
		if (branches.has(branch.keyPoint)) {
			ctx.addIssue({
				code: 'custom',
				path,
				message: fr.validation.duplicateValue(branch.keyPoint)
			});
		}
		branches.add(branch.keyPoint);
	});
	sheet.assessment?.exerciseIds?.forEach((id, i) =>
		checkRef(id, exerciseIds, 'exercises', [...at, 'assessment', 'exerciseIds', i], ctx)
	);
	sheet.assessment?.paper?.rubric.forEach((row, r) =>
		keyPoint(row.keyPoint, ['assessment', 'paper', 'rubric', r, 'keyPoint'])
	);
}

/** `pocketclass/sheet@1`: one sheet, added to (or updated in) the chapter it is imported into. */
export const sheetSchema = sheetBodySchema
	.extend({
		format: z.literal(SHEET_FORMAT),
		warnings: z.array(z.string()).optional()
	})
	.superRefine((sheet, ctx) => checkSheet(sheet, [], ctx));

export type SheetImport = z.infer<typeof sheetSchema>;
