import { describe, expect, it } from 'vitest';
import { validate } from './errors.ts';
import { pathSchema, type PathDoc } from './path.ts';

/** Smallest valid path, as plain JSON (defaults omitted). */
function minimalPath() {
	return {
		format: 'pocketclass/path@1',
		id: 'maths-3e-test',
		subject: 'Mathématiques',
		title: 'Test',
		grade: '3e',
		type: 'test',
		version: 1,
		topics: [{ id: 'numbers', title: 'Nombres' }],
		concepts: [
			{
				id: 'maths-3e-fractions',
				topic: 'numbers',
				title: 'Fractions',
				keyPoints: [
					{ id: 'kp-simplify', label: 'Simplifier' },
					{ id: 'kp-add', label: 'Additionner' }
				],
				sheet: {
					sections: [{ title: 'Règle', text: 'Texte $\\frac{1}{2}$', keyPoints: ['kp-simplify'] }]
				},
				exercises: [
					{
						id: 'ex-1',
						usage: 'practice',
						keyPoint: 'kp-simplify',
						type: 'calculation',
						statement: 'Simplifier 2/4',
						answer: '1/2'
					},
					{
						id: 'ex-2',
						usage: 'assessment',
						keyPoint: 'kp-add',
						type: 'cloze',
						text: '1/3 + 1/3 = [[2/3]]'
					}
				],
				assessment: {
					type: 'brevet',
					draw: { perKeyPoint: 2 },
					exerciseIds: ['ex-2'],
					paper: { instruction: 'Résous', rubric: [{ keyPoint: 'kp-add', criterion: 'Juste' }] }
				}
			}
		]
	};
}

function errorsOf(data: unknown): string[] {
	const result = validate(pathSchema, data);
	return result.success ? [] : result.errors;
}

describe('pathSchema', () => {
	it('accepts a minimal valid path and applies defaults', () => {
		const result = validate(pathSchema, minimalPath());
		expect(result.success).toBe(true);
		const path = (result as { data: PathDoc }).data;
		const concept = path.concepts[0];
		expect(concept.prerequisites).toEqual([]);
		expect(concept.sheet.pitfalls).toEqual([]);
		expect(concept.sheet.sections[0].examples).toEqual([]);
		expect(concept.exercises[0].difficulty).toBe(1);
	});

	it('accepts every exercise type', () => {
		const data = minimalPath();
		const base = { usage: 'practice', keyPoint: 'kp-add' };
		data.concepts[0].exercises.push(
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
		const data = minimalPath();
		data.concepts[0].topic = 'geometry';
		data.concepts[0].exercises[0].keyPoint = 'kp-xyz';
		data.concepts[0].sheet.sections[0].keyPoints = ['kp-nope'];
		data.concepts[0].assessment.exerciseIds = ['ex-404'];
		data.concepts[0].assessment.paper.rubric[0].keyPoint = 'kp-zzz';

		expect(errorsOf(data)).toEqual([
			"concepts[0].topic : « geometry » n'existe pas dans topics",
			"concepts[0].sheet.sections[0].keyPoints[0] : « kp-nope » n'existe pas dans keyPoints",
			"concepts[0].exercises[0].keyPoint : « kp-xyz » n'existe pas dans keyPoints",
			"concepts[0].assessment.exerciseIds[0] : « ex-404 » n'existe pas dans exercises",
			"concepts[0].assessment.paper.rubric[0].keyPoint : « kp-zzz » n'existe pas dans keyPoints"
		]);
	});

	it('reports duplicate ids', () => {
		const data = minimalPath();
		data.concepts[0].exercises[1].id = 'ex-1';
		data.concepts[0].keyPoints[1].id = 'kp-simplify';
		data.concepts[0].exercises[1].keyPoint = 'kp-simplify';
		data.concepts[0].assessment.paper.rubric[0].keyPoint = 'kp-simplify';
		data.concepts[0].assessment.exerciseIds = ['ex-1'];
		expect(errorsOf(data)).toEqual([
			"concepts[0].keyPoints[1].id : l'identifiant « kp-simplify » est utilisé plusieurs fois",
			"concepts[0].exercises[1].id : l'identifiant « ex-1 » est utilisé plusieurs fois"
		]);
	});

	it('rejects empty or missing cloze blanks', () => {
		const data = minimalPath();
		(data.concepts[0].exercises[1] as { text: string }).text = 'Nous [[ ]] et [[mangeons]].';
		expect(errorsOf(data)).toEqual(['concepts[0].exercises[1].text : un trou [[ ]] est vide']);

		(data.concepts[0].exercises[1] as { text: string }).text = 'Pas de trou.';
		expect(errorsOf(data)).toEqual([
			'concepts[0].exercises[1].text : le texte doit contenir au moins un trou [[…]]'
		]);
	});

	it('reports structural errors in French with the field path', () => {
		const data = minimalPath() as Record<string, unknown>;
		data.format = 'pocketclass/path@2';
		data.version = 0;
		data.id = 'Maths 3e';
		const errors = errorsOf(data);
		expect(errors).toHaveLength(3);
		expect(errors[0]).toMatch(/^format : .*"pocketclass\/path@1" attendu/);
		expect(errors[1]).toMatch(/^id : identifiant invalide/);
		expect(errors[2]).toMatch(/^version : Trop petit/);
	});

	it('rejects an unknown exercise type and a wrong number of distractors', () => {
		const data = minimalPath();
		const base = { id: 'x', usage: 'practice', keyPoint: 'kp-add' };
		data.concepts[0].exercises.push(
			{ ...base, type: 'quiz' } as never,
			{ ...base, id: 'y', type: 'mcq', question: 'Q', answer: 'A', distractors: ['B'] } as never
		);
		const errors = errorsOf(data);
		expect(errors[0]).toMatch(/^concepts\[0\]\.exercises\[2\]\.type : /);
		expect(errors[1]).toMatch(/^concepts\[0\]\.exercises\[3\]\.distractors : Trop petit/);
	});

	it('rejects a calculation answer that is neither a number nor a fraction', () => {
		const data = minimalPath();
		data.concepts[0].exercises[0].answer = 'un demi';
		expect(errorsOf(data)).toEqual([
			'concepts[0].exercises[0].answer : réponse invalide : un nombre (ex. 3 ou 2,5) ou une fraction « a/b » est attendu'
		]);
	});

	it('requires between 1 and 8 key points', () => {
		const data = minimalPath();
		data.concepts[0].keyPoints = [];
		expect(errorsOf(data)[0]).toMatch(/^concepts\[0\]\.keyPoints : Trop petit/);
	});
});
