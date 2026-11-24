import { z } from 'zod';
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
	keyPoints: z.array(slug)
});

const assessmentSchema = z.object({
	type: z.enum(ASSESSMENT_TYPES),
	draw: z.object({ perKeyPoint: z.int().min(1) }).optional(),
	exerciseIds: z.array(slug).optional(),
	paper: z
		.object({
			instruction: text,
			rubric: z.array(z.object({ keyPoint: slug, criterion: text })).min(1)
		})
		.optional()
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

/** One revision sheet (a "concept"): key points, study sheet, exercises, assessment. */
export const sheetBodySchema = z.object({
	id: slug,
	title: text,
	tags: tagsSchema,
	prerequisites: z.array(slug).default([]),
	keyPoints: z.array(keyPointSchema).min(1).max(8),
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
