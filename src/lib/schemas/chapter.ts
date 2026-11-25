import { z } from 'zod';
import { checkUniqueIds, text } from './common.ts';
import { checkSheet, sheetBodySchema, type SheetDoc } from './sheet.ts';

export const CHAPTER_FORMAT = 'pocketclass/chapter@1';

/** A chapter and its sheets (in `chapter@1`, and in the chapters of `subject@1`). */
export const chapterBodySchema = z.object({
	title: text,
	/** Optional heading the chapter is shown under (e.g. "Algèbre"). */
	group: text.optional(),
	sheets: z.array(sheetBodySchema)
});

export type ChapterDoc = z.infer<typeof chapterBodySchema>;

/** Sheet ids are family-wide: unique across every chapter of a document; each sheet checked. */
export function checkSheetsOf(
	chapters: { sheets: SheetDoc[] }[],
	at: (index: number) => (string | number)[],
	ctx: z.RefinementCtx
): void {
	const all = chapters.flatMap((chapter) => chapter.sheets);
	checkUniqueIds(all, ['sheets'], ctx);
	chapters.forEach((chapter, c) =>
		chapter.sheets.forEach((sheet, s) => checkSheet(sheet, [...at(c), 'sheets', s], ctx))
	);
}

/** `pocketclass/chapter@1`: a new chapter with several sheets, imported into a subject. */
export const chapterSchema = chapterBodySchema
	.extend({
		format: z.literal(CHAPTER_FORMAT),
		sheets: z.array(sheetBodySchema).min(1),
		warnings: z.array(z.string()).optional()
	})
	.superRefine((chapter, ctx) => checkSheetsOf([chapter], () => [], ctx));

export type ChapterImport = z.infer<typeof chapterSchema>;
