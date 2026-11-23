import { z } from 'zod';
import {
	ASSESSMENT_TYPES,
	checkRef,
	checkUniqueIds,
	exerciseSchema,
	slug,
	text
} from './common.ts';

export const PATH_FORMAT = 'pocketclass/path@1';
export const PATH_TYPES = ['brevet', 'test', 'lessons'] as const;

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

const conceptSchema = z.object({
	id: slug,
	topic: slug,
	title: text,
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

export const pathSchema = z
	.object({
		format: z.literal(PATH_FORMAT),
		id: slug,
		subject: text,
		title: text,
		grade: text,
		type: z.enum(PATH_TYPES),
		version: z.int().min(1),
		topics: z.array(z.object({ id: slug, title: text })).min(1),
		concepts: z.array(conceptSchema).min(1),
		warnings: z.array(z.string()).optional()
	})
	.superRefine((path, ctx) => {
		checkUniqueIds(path.topics, ['topics'], ctx);
		checkUniqueIds(path.concepts, ['concepts'], ctx);
		const topicIds = new Set(path.topics.map((t) => t.id));

		path.concepts.forEach((concept, c) => {
			const at = ['concepts', c];
			checkRef(concept.topic, topicIds, 'topics', [...at, 'topic'], ctx);
			checkUniqueIds(concept.keyPoints, [...at, 'keyPoints'], ctx);
			checkUniqueIds(concept.exercises, [...at, 'exercises'], ctx);

			const keyPointIds = new Set(concept.keyPoints.map((k) => k.id));
			const exerciseIds = new Set(concept.exercises.map((e) => e.id));

			concept.sheet.sections.forEach((section, s) =>
				section.keyPoints.forEach((kp, k) =>
					checkRef(
						kp,
						keyPointIds,
						'keyPoints',
						[...at, 'sheet', 'sections', s, 'keyPoints', k],
						ctx
					)
				)
			);
			concept.exercises.forEach((exercise, e) =>
				checkRef(
					exercise.keyPoint,
					keyPointIds,
					'keyPoints',
					[...at, 'exercises', e, 'keyPoint'],
					ctx
				)
			);
			concept.assessment?.exerciseIds?.forEach((id, i) =>
				checkRef(id, exerciseIds, 'exercises', [...at, 'assessment', 'exerciseIds', i], ctx)
			);
			concept.assessment?.paper?.rubric.forEach((row, r) =>
				checkRef(
					row.keyPoint,
					keyPointIds,
					'keyPoints',
					[...at, 'assessment', 'paper', 'rubric', r, 'keyPoint'],
					ctx
				)
			);
		});
	});

export type PathDoc = z.infer<typeof pathSchema>;
export type ConceptDoc = PathDoc['concepts'][number];
export type KeyPoint = z.infer<typeof keyPointSchema>;
export type SheetSection = z.infer<typeof sectionSchema>;
export type AssessmentDoc = z.infer<typeof assessmentSchema>;
