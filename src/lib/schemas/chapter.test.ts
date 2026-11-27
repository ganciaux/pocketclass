import { describe, expect, it } from 'vitest';
import {
	chapterSchema,
	chaptersOf,
	courseSchema,
	sheetOrChapterSchema,
	sheetsOf,
	thinChapters
} from './chapter.ts';
import { validate } from './errors.ts';
import { minimalSheet } from './sheet.fixture.ts';

/** A sheet as it appears inside a chapter (no `format`). */
function sheetBody(id: string) {
	const { format: _format, ...sheet } = minimalSheet();
	return { ...sheet, id };
}

function errorsOf(data: unknown): string[] {
	const result = validate(chapterSchema, data);
	return result.success ? [] : result.errors;
}

describe('chapterSchema', () => {
	it('accepts a chapter with several sheets and an optional group', () => {
		const chapter = {
			format: 'pocketclass/chapter@1',
			title: 'Calcul numérique',
			group: 'Nombres et calculs',
			sheets: [sheetBody('fractions'), sheetBody('powers')]
		};
		expect(errorsOf(chapter)).toEqual([]);
		expect(errorsOf({ ...chapter, group: undefined })).toEqual([]);
	});

	it('reports duplicate sheet ids and broken references with the sheet index', () => {
		const second = sheetBody('fractions');
		second.exercises[0].keyPoint = 'kp-nope';
		expect(
			errorsOf({
				format: 'pocketclass/chapter@1',
				title: 'Calcul',
				sheets: [sheetBody('fractions'), second]
			})
		).toEqual([
			"sheets[1].id : l'identifiant « fractions » est utilisé plusieurs fois",
			"sheets[1].exercises[0].keyPoint : « kp-nope » n'existe pas dans keyPoints"
		]);
	});

	it('requires at least one sheet', () => {
		const errors = errorsOf({ format: 'pocketclass/chapter@1', title: 'Vide', sheets: [] });
		expect(errors[0]).toMatch(/^sheets : Trop petit/);
	});
});

describe('sheetOrChapterSchema (parent chapter page)', () => {
	it('accepts one sheet or a whole chapter, and gives their sheets', () => {
		const sheet = validate(sheetOrChapterSchema, minimalSheet());
		const chapter = validate(sheetOrChapterSchema, {
			format: 'pocketclass/chapter@1',
			title: 'Calcul numérique',
			sheets: [sheetBody('fractions'), sheetBody('powers')]
		});
		if (!sheet.success || !chapter.success) throw new Error('both should be valid');
		expect(sheetsOf(sheet.data).map((s) => s.id)).toEqual([minimalSheet().id]);
		expect(sheetsOf(chapter.data).map((s) => s.id)).toEqual(['fractions', 'powers']);
	});

	it('still reports the errors of the sheet', () => {
		const result = validate(sheetOrChapterSchema, { ...minimalSheet(), keyPoints: [] });
		expect(result.success).toBe(false);
	});
});

describe('courseSchema (a course split into chapters, subject page)', () => {
	const course = (chapters: { title: string; sheets: ReturnType<typeof sheetBody>[] }[]) => ({
		format: 'pocketclass/chapters@1',
		chapters
	});

	it('accepts several chapters, each with its sheets, and gives them in order', () => {
		const result = validate(
			courseSchema,
			course([
				{ title: 'Le prétérit', sheets: [sheetBody('preterit'), sheetBody('irregular')] },
				{ title: 'Les métiers', sheets: [sheetBody('jobs'), sheetBody('jobs-verbs')] }
			])
		);
		if (!result.success) throw new Error(result.errors.join('\n'));
		expect(chaptersOf(result.data).map((c) => c.title)).toEqual(['Le prétérit', 'Les métiers']);
	});

	it('still accepts one chapter (chapter@1)', () => {
		const result = validate(courseSchema, {
			format: 'pocketclass/chapter@1',
			title: 'Calcul',
			sheets: [sheetBody('fractions')]
		});
		if (!result.success) throw new Error('should be valid');
		expect(chaptersOf(result.data)).toHaveLength(1);
	});

	it('keeps sheet ids unique across chapters, and refuses an empty chapter', () => {
		const duplicate = validate(
			courseSchema,
			course([
				{ title: 'A', sheets: [sheetBody('same')] },
				{ title: 'B', sheets: [sheetBody('same')] }
			])
		);
		expect(!duplicate.success && duplicate.errors[0]).toMatch(
			/« same » est utilisé plusieurs fois/
		);
		const empty = validate(courseSchema, course([{ title: 'Vide', sheets: [] }]));
		expect(empty.success).toBe(false);
	});
});

describe('thinChapters', () => {
	const chapter = (title: string, count: number) => ({
		title,
		sheets: Array.from({ length: count }, (_, i) => sheetBody(`${title}-${i}`))
	});

	it('names the chapters of a course with a single sheet', () => {
		expect(thinChapters([chapter('Grammaire', 3), chapter('Phonétique', 1)])).toEqual([
			'Phonétique'
		]);
	});

	it('says nothing about a course of one chapter', () => {
		expect(thinChapters([chapter('Tout', 1)])).toEqual([]);
	});
});
