import { z } from 'zod';
import { lessonExerciseSchema, text } from './common.ts';

export const LESSON_FORMAT = 'pocketclass/lesson@1';

/** A lesson captured from a photo of the exercise book (imported in phase 6). */
export const lessonSchema = z.object({
	format: z.literal(LESSON_FORMAT),
	subject: text,
	title: text,
	grade: text,
	dueDate: z.iso.date().optional(),
	exercises: z.array(lessonExerciseSchema).min(1),
	warnings: z.array(z.string()).optional()
});

export type LessonDoc = z.infer<typeof lessonSchema>;
