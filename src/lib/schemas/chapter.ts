import { z } from 'zod';
import { checkUniqueIds, text } from './common.ts';
import { checkSheet, sheetBodySchema } from './sheet.ts';

export const CHAPTER_FORMAT = 'pocketclass/chapter@1';

/** `pocketclass/chapter@1`: a new chapter with several sheets, imported into a subject. */
export const chapterSchema = z
	.object({
		format: z.literal(CHAPTER_FORMAT),
		title: text,
		/** Optional heading the chapter is shown under (e.g. "Algèbre"). */
		group: text.optional(),
		sheets: z.array(sheetBodySchema).min(1),
		warnings: z.array(z.string()).optional()
	})
	.superRefine((chapter, ctx) => {
		checkUniqueIds(chapter.sheets, ['sheets'], ctx);
		chapter.sheets.forEach((sheet, s) => checkSheet(sheet, ['sheets', s], ctx));
	});

export type ChapterImport = z.infer<typeof chapterSchema>;
