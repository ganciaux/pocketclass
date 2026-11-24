import { describe, expect, it } from 'vitest';
import { chapterSchema } from './chapter.ts';
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
