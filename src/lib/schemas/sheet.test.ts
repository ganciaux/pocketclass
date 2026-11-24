import { describe, expect, it } from 'vitest';
import { validate } from './errors.ts';
import { sheetSchema, type SheetImport } from './sheet.ts';
import { minimalSheet } from './sheet.fixture.ts';

function errorsOf(data: unknown): string[] {
	const result = validate(sheetSchema, data);
	return result.success ? [] : result.errors;
}

describe('sheetSchema', () => {
	it('accepts a minimal valid sheet and applies defaults', () => {
		const result = validate(sheetSchema, minimalSheet());
		expect(result.success).toBe(true);
		const concept = (result as { data: SheetImport }).data;
		expect(concept.prerequisites).toEqual([]);
		expect(concept.sheet.pitfalls).toEqual([]);
		expect(concept.sheet.sections[0].examples).toEqual([]);
		expect(concept.exercises[0].difficulty).toBe(1);
	});

	it('accepts every exercise type', () => {
		const data = minimalSheet();
		const base = { usage: 'practice', keyPoint: 'kp-add' };
		data.exercises.push(
			{ ...base, id: 'p', type: 'pair', front: 'a', back: 'b' } as never,
			{
				...base,
				id: 'q',
				type: 'mcq',
				question: 'Q',
				answer: 'A',
				distractors: ['B', 'C', 'D']
			} as never,
			{ ...base, id: 'o', type: 'ordering', instruction: 'Range', items: ['1', '2'] } as never,
			{ ...base, id: 'op', type: 'open', question: 'Q', answers: ['R'] } as never,
			{ ...base, id: 'pa', type: 'paper', instruction: 'Fais', answerFormat: 'none' } as never,
			{ ...base, id: 'g', type: 'generator', generator: 'fractions.add' } as never
		);
		expect(errorsOf(data)).toEqual([]);
	});

	it('reports unknown references with their French message and path', () => {
		const data = minimalSheet();
		data.exercises[0].keyPoint = 'kp-xyz';
		data.sheet.sections[0].keyPoints = ['kp-nope'];
		data.assessment.exerciseIds = ['ex-404'];
		data.assessment.paper.rubric[0].keyPoint = 'kp-zzz';

		expect(errorsOf(data)).toEqual([
			"sheet.sections[0].keyPoints[0] : « kp-nope » n'existe pas dans keyPoints",
			"exercises[0].keyPoint : « kp-xyz » n'existe pas dans keyPoints",
			"assessment.exerciseIds[0] : « ex-404 » n'existe pas dans exercises",
			"assessment.paper.rubric[0].keyPoint : « kp-zzz » n'existe pas dans keyPoints"
		]);
	});

	it('reports duplicate ids', () => {
		const data = minimalSheet();
		data.exercises[1].id = 'ex-1';
		data.keyPoints[1].id = 'kp-simplify';
		data.exercises[1].keyPoint = 'kp-simplify';
		data.assessment.paper.rubric[0].keyPoint = 'kp-simplify';
		data.assessment.exerciseIds = ['ex-1'];
		expect(errorsOf(data)).toEqual([
			"keyPoints[1].id : l'identifiant « kp-simplify » est utilisé plusieurs fois",
			"exercises[1].id : l'identifiant « ex-1 » est utilisé plusieurs fois"
		]);
	});

	it('rejects empty or missing cloze blanks', () => {
		const data = minimalSheet();
		(data.exercises[1] as { text: string }).text = 'Nous [[ ]] et [[mangeons]].';
		expect(errorsOf(data)).toEqual(['exercises[1].text : un trou [[ ]] est vide']);

		(data.exercises[1] as { text: string }).text = 'Pas de trou.';
		expect(errorsOf(data)).toEqual([
			'exercises[1].text : le texte doit contenir au moins un trou [[…]]'
		]);
	});

	it('reports structural errors in French with the field path', () => {
		const data = minimalSheet() as Record<string, unknown>;
		data.format = 'pocketclass/sheet@2';
		data.keyPoints = [];
		data.id = 'Maths 3e';
		const errors = errorsOf(data);
		expect(errors).toHaveLength(3);
		expect(errors[0]).toMatch(/^id : identifiant invalide/);
		expect(errors[1]).toMatch(/^keyPoints : Trop petit/);
		expect(errors[2]).toMatch(/^format : .*"pocketclass\/sheet@1" attendu/);
	});

	it('rejects an unknown exercise type and a wrong number of distractors', () => {
		const data = minimalSheet();
		const base = { id: 'x', usage: 'practice', keyPoint: 'kp-add' };
		data.exercises.push(
			{ ...base, type: 'quiz' } as never,
			{ ...base, id: 'y', type: 'mcq', question: 'Q', answer: 'A', distractors: ['B'] } as never
		);
		const errors = errorsOf(data);
		expect(errors[0]).toMatch(/^exercises\[2\]\.type : /);
		expect(errors[1]).toMatch(/^exercises\[3\]\.distractors : Trop petit/);
	});

	it('rejects a calculation answer that is neither a number nor a fraction', () => {
		const data = minimalSheet();
		data.exercises[0].answer = 'un demi';
		expect(errorsOf(data)).toEqual([
			'exercises[0].answer : réponse invalide : un nombre (ex. 3 ou 2,5) ou une fraction « a/b » est attendu'
		]);
	});

	it('requires between 1 and 8 key points', () => {
		const data = minimalSheet();
		data.keyPoints = [];
		expect(errorsOf(data)[0]).toMatch(/^keyPoints : Trop petit/);
	});
});
