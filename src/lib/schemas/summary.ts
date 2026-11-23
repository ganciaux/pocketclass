import { z } from 'zod';
import { fr } from '#lib/i18n/fr.ts';
import { checkUniqueIds, slug, text } from './common.ts';

export const SUMMARY_FORMAT = 'pocketclass/summary@1';
export const KEY_POINT_STATUSES = ['acquired', 'partial', 'missing', 'wrong'] as const;

/** External AI review of a handwritten summary (imported in phase 4). */
export const summarySchema = z
	.object({
		format: z.literal(SUMMARY_FORMAT),
		conceptId: slug,
		code: text,
		legible: z.boolean(),
		transcription: z.string(),
		keyPoints: z.array(
			z.object({
				id: slug,
				status: z.enum(KEY_POINT_STATUSES),
				comment: z.string().default('')
			})
		),
		errors: z.array(z.object({ excerpt: text, correction: text })).default([]),
		score: z.object({ acquired: z.int().min(0), total: z.int().min(0) }).optional(),
		advice: z.string()
	})
	.superRefine((summary, ctx) => {
		checkUniqueIds(summary.keyPoints, ['keyPoints'], ctx);
		if (summary.score && summary.score.acquired > summary.score.total) {
			ctx.addIssue({
				code: 'custom',
				path: ['score', 'acquired'],
				message: fr.validation.scoreTooHigh
			});
		}
	});

export type SummaryDoc = z.infer<typeof summarySchema>;
