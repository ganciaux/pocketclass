import { z } from 'zod';
import { checkUniqueIds, text } from './common.ts';
import { checkSheet, sheetBodySchema, sheetSchema, type SheetDoc } from './sheet.ts';

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

/**
 * What the parent's chapter page accepts: one sheet, or a whole `chapter@1` (an export of this
 * chapter given back by an AI) whose sheets are added to or updated in this chapter.
 */
export const sheetOrChapterSchema = z.discriminatedUnion('format', [sheetSchema, chapterSchema]);

export type SheetOrChapterImport = z.infer<typeof sheetOrChapterSchema>;

/** The sheets of a sheet or chapter file. */
export const sheetsOf = (file: SheetOrChapterImport): SheetDoc[] =>
	file.format === CHAPTER_FORMAT ? file.sheets : [file];

export const CHAPTERS_FORMAT = 'pocketclass/chapters@1';

/** A course split by the AI into chapters: at most this many (one per big theme). */
export const MAX_CHAPTERS = 12;
/** Fewer sheets than this makes a « thin » chapter: allowed, but the preview points it out. */
export const MIN_SHEETS_PER_CHAPTER = 2;

/**
 * `pocketclass/chapters@1`: a course (e.g. photos of the exercise book) split into chapters, one
 * per big theme, each with its sheets; created at the end of a subject, in this order.
 */
export const chaptersSchema = z
	.object({
		format: z.literal(CHAPTERS_FORMAT),
		chapters: z
			.array(chapterBodySchema.extend({ sheets: z.array(sheetBodySchema).min(1) }))
			.min(1)
			.max(MAX_CHAPTERS),
		warnings: z.array(z.string()).optional()
	})
	.superRefine((file, ctx) => checkSheetsOf(file.chapters, (c) => ['chapters', c], ctx));

/** What the subject page accepts: one new chapter, or a course split into chapters. */
export const courseSchema = z.discriminatedUnion('format', [chapterSchema, chaptersSchema]);

export type CourseImport = z.infer<typeof courseSchema>;

/** The chapters of a chapter or course file. */
export const chaptersOf = (file: CourseImport): ChapterDoc[] =>
	file.format === CHAPTERS_FORMAT ? file.chapters : [file];

/** Titles of the chapters with fewer than `MIN_SHEETS_PER_CHAPTER` sheets (several only). */
export function thinChapters(chapters: { title: string; sheets: unknown[] }[]): string[] {
	if (chapters.length < 2) return [];
	return chapters.filter((c) => c.sheets.length < MIN_SHEETS_PER_CHAPTER).map((c) => c.title);
}
