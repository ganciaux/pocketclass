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

	it('accepts an optional short summary per section (1 to 5 bullets)', () => {
		const withSummary = (summary: unknown) => {
			const data = minimalSheet();
			(data.sheet.sections[0] as Record<string, unknown>).summary = summary;
			return errorsOf(data);
		};
		expect(withSummary(['Règle 1', 'Méthode'])).toEqual([]);
		expect(withSummary([])).not.toEqual([]);
		expect(withSummary(Array.from({ length: 6 }, (_, i) => `R${i}`))).not.toEqual([]);
	});

	it('defaults tags to an empty list', () => {
		const result = validate(sheetSchema, minimalSheet());
		expect((result as { data: SheetImport }).data.tags).toEqual([]);
	});

	it('trims tags and drops duplicates ignoring case and accents', () => {
		const data = { ...minimalSheet(), tags: [' Fraction ', 'fraction', 'Fractión', 'COD'] };
		const result = validate(sheetSchema, data);
		expect((result as { data: SheetImport }).data.tags).toEqual(['Fraction', 'COD']);
	});

	it('rejects more than 10 tags or a tag over 30 characters', () => {
		const many = Array.from({ length: 11 }, (_, i) => `tag ${i}`);
		expect(errorsOf({ ...minimalSheet(), tags: many })).not.toEqual([]);
		expect(errorsOf({ ...minimalSheet(), tags: ['x'.repeat(31)] })).not.toEqual([]);
		expect(errorsOf({ ...minimalSheet(), tags: ['  '] })).not.toEqual([]);
	});

	it('accepts a mind map: a few short leaves per key point', () => {
		const mindMap = [
			{ keyPoint: 'kp-simplify', leaves: ['diviser haut et bas', '$\\frac{2}{4} = \\frac{1}{2}$'] },
			{ keyPoint: 'kp-add', leaves: ['même dénominateur'] }
		];
		const result = validate(sheetSchema, { ...minimalSheet(), mindMap });
		expect((result as { data: SheetImport }).data.mindMap).toEqual(mindMap);
		expect((validate(sheetSchema, minimalSheet()) as { data: SheetImport }).data.mindMap).toBe(
			undefined
		);
	});

	it('rejects a mind map branch on an unknown or repeated key point', () => {
		const branch = (keyPoint: string) => ({ keyPoint, leaves: ['x'] });
		expect(errorsOf({ ...minimalSheet(), mindMap: [branch('kp-nope')] }).join()).toContain(
			'kp-nope'
		);
		expect(
			errorsOf({ ...minimalSheet(), mindMap: [branch('kp-add'), branch('kp-add')] }).join()
		).toContain('kp-add');
	});

	it('rejects empty, too many or too long mind map leaves', () => {
		const leaves = (list: string[]) => ({
			...minimalSheet(),
			mindMap: [{ keyPoint: 'kp-add', leaves: list }]
		});
		expect(errorsOf(leaves([]))).not.toEqual([]);
		expect(errorsOf(leaves(['a', 'b', 'c', 'd', 'e']))).not.toEqual([]);
		// Asked ≤ 60 in the prompt, accepted up to 90 (AIs count badly).
		expect(errorsOf(leaves(['x'.repeat(90)]))).toEqual([]);
		expect(errorsOf(leaves(['x'.repeat(91)]))).not.toEqual([]);
	});

	it('accepts revision cards (flashcards) with a tag, a front, a back and an optional example', () => {
		const flashcards = [
			{
				tag: 'definition',
				front: 'Une fraction irréductible ?',
				back: 'On ne peut plus la simplifier.'
			},
			{
				tag: 'pitfall',
				front: '$\\frac{1}{2} + \\frac{1}{3} = \\frac{2}{5}$ ?',
				back: 'Faux : on additionne avec le même dénominateur.',
				example: '$\\frac{3}{6} + \\frac{2}{6} = \\frac{5}{6}$'
			}
		];
		const result = validate(sheetSchema, { ...minimalSheet(), flashcards });
		expect((result as { data: SheetImport }).data.flashcards).toEqual(flashcards);
		expect(
			(validate(sheetSchema, minimalSheet()) as { data: SheetImport }).data.flashcards
		).toBeUndefined();
	});

	it('rejects an unknown card tag, too long a side or more than 20 cards', () => {
		const card = { tag: 'rule', front: 'Recto ?', back: 'Verso.' };
		const cards = (list: object[]) => errorsOf({ ...minimalSheet(), flashcards: list });
		expect(cards([card])).toEqual([]);
		expect(cards([{ ...card, tag: 'joke' }])).not.toEqual([]);
		expect(cards([{ ...card, front: 'x'.repeat(161) }])).not.toEqual([]);
		expect(cards([{ ...card, back: 'x'.repeat(301) }])).not.toEqual([]);
		expect(cards([{ ...card, example: 'x'.repeat(201) }])).not.toEqual([]);
		expect(
			cards(Array.from({ length: 21 }, (_, i) => ({ ...card, front: `Q${i} ?` })))
		).not.toEqual([]);
	});

	it('rejects a generator name that is not in the catalogue', () => {
		const data = minimalSheet();
		const base = { usage: 'practice', keyPoint: 'kp-add', type: 'generator' };
		data.exercises.push({ ...base, id: 'g1', generator: 'units.length' } as never);
		expect(errorsOf(data)).toEqual([]);
		data.exercises.push({ ...base, id: 'g2', generator: 'fractions.magic' } as never);
		expect(errorsOf(data).join(' ')).toContain('générateur « fractions.magic » inconnu');
	});

	it("rejects an AI's correction left in an answer (« x -> non, y »)", () => {
		const base = { usage: 'practice', keyPoint: 'kp-add' };
		const data = minimalSheet();
		data.exercises.push(
			...([
				{
					...base,
					id: 'q',
					type: 'mcq',
					question: 'Q',
					answer: 'a -> non, b',
					distractors: ['c', 'd', 'e']
				},
				{ ...base, id: 'c', type: 'cloze', text: "je [[suis -> non, j'oublie]] [[oublie]]" }
			] as never[])
		);
		const errors = errorsOf(data).join(' ');
		expect(errors).toContain('« a -> non, b » contient « -> »');
		expect(errors).toContain("« suis -> non, j'oublie » contient « -> »");
	});

	it('rejects an MCQ whose options repeat, and twin categories', () => {
		const base = { usage: 'practice', keyPoint: 'kp-add', type: 'mcq', question: 'Q' };
		const withMcq = (answer: string, distractors: string[]) => {
			const data = minimalSheet();
			data.exercises.push({ ...base, id: 'q', answer, distractors } as never);
			return errorsOf(data).join(' ');
		};
		expect(withMcq('A', ['B', 'C', 'D'])).toBe('');
		expect(withMcq('A', ['A', 'C', 'D'])).toContain('« A » apparaît plusieurs fois');
		expect(withMcq('A', ['B', 'B', 'D'])).toContain('« B » apparaît plusieurs fois');
		const data = minimalSheet();
		data.exercises.push({
			usage: 'practice',
			keyPoint: 'kp-add',
			id: 'c',
			type: 'categorize',
			categories: ['x', 'x'],
			items: [
				{ text: 'a', category: 'x' },
				{ text: 'b', category: 'x' }
			]
		} as never);
		expect(errorsOf(data).join(' ')).toContain('« x » apparaît plusieurs fois');
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

	it('accepts the match, true/false and categorize types, and an explanation on any type', () => {
		const data = minimalSheet();
		const base = { usage: 'practice', keyPoint: 'kp-add' };
		data.exercises.push(
			{
				...base,
				id: 'm',
				type: 'match',
				pairs: [
					{ left: '1/2', right: '0,5' },
					{ left: '1/4', right: '0,25' }
				],
				explanation: 'Diviser le numérateur par le dénominateur.'
			} as never,
			{ ...base, id: 'tf', type: 'true_false', statement: '1/2 = 2/4', answer: true } as never,
			{
				...base,
				id: 'c',
				type: 'categorize',
				instruction: 'Range ces fractions',
				categories: ['Irréductible', 'Simplifiable'],
				items: [
					{ text: '1/2', category: 'Irréductible' },
					{ text: '2/4', category: 'Simplifiable' }
				]
			} as never
		);
		const result = validate(sheetSchema, data);
		expect(result.success).toBe(true);
		const exercises = (result as { data: SheetImport }).data.exercises;
		expect(exercises.find((e) => e.id === 'm')?.explanation).toMatch(/^Diviser/);
	});

	it('rejects a categorize item outside the categories and a duplicated match side', () => {
		const data = minimalSheet();
		const base = { usage: 'practice', keyPoint: 'kp-add' };
		data.exercises.push(
			{
				...base,
				id: 'c',
				type: 'categorize',
				categories: ['Pair', 'Impair'],
				items: [
					{ text: '2', category: 'Pair' },
					{ text: '3', category: 'Premier' }
				]
			} as never,
			{
				...base,
				id: 'm',
				type: 'match',
				pairs: [
					{ left: 'a', right: 'x' },
					{ left: 'a', right: 'y' }
				]
			} as never
		);
		expect(errorsOf(data)).toEqual([
			"exercises[2].items[1].category : « Premier » n'existe pas dans categories",
			'exercises[3].pairs[1].left : « a » apparaît plusieurs fois'
		]);
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
