import { describe, expect, it } from 'vitest';
import { chapterPrompt, idPrefix, sheetPrompt, type PromptContext } from './sheetPrompt.ts';

const ctx: PromptContext = {
	subject: 'Mathématiques',
	grade: '3e',
	chapter: 'Calcul numérique',
	group: 'Nombres et calculs',
	request: 'Les puissances de 10',
	existingTitles: ['Fractions'],
	usedIds: ['mathematiques-3e-fractions']
};

describe('prompts', () => {
	it('suggests an id prefix from the subject and grade', () => {
		expect(idPrefix('Mathématiques', '3e')).toBe('mathematiques-3e-');
		expect(idPrefix('Histoire-Géo', '6e')).toBe('histoire-6e-');
	});

	it('fills the sheet prompt with the chapter context', () => {
		const prompt = sheetPrompt(ctx);
		expect(prompt).toContain('"pocketclass/sheet@1"');
		expect(prompt).toContain('Chapitre : Calcul numérique (partie « Nombres et calculs »).');
		expect(prompt).toContain('Sujet de la fiche : Les puissances de 10.');
		expect(prompt).toContain('Fiches déjà présentes dans ce chapitre : Fractions.');
		expect(prompt).toContain('(à ne pas reprendre) : mathematiques-3e-fractions.');
		expect(prompt).toContain('commence par "mathematiques-3e-"');
	});

	it('asks for tags a pupil would type', () => {
		const prompt = sheetPrompt(ctx);
		expect(prompt).toContain('"tags"');
		expect(prompt).toContain('3 à 8 mots-clés');
	});

	it('asks for enough varied practice, true/false items and explanations', () => {
		const prompt = sheetPrompt(ctx);
		expect(prompt).toContain(
			'environ 4 exercices d\'entraînement ("usage": "practice") par point-clé'
		);
		expect(prompt).toContain('8 à 10 "true_false"');
		expect(prompt).toContain('"explanation"');
		for (const type of ['"match"', '"true_false"', '"categorize"']) expect(prompt).toContain(type);
	});

	it('lists the generators of the grade, with their params', () => {
		const prompt = sheetPrompt(ctx);
		expect(prompt).toContain('"type": "generator"');
		expect(prompt).toContain('"algebra.identities"');
		expect(prompt).toContain('"units.length" : convertir des longueurs');
		expect(prompt).toContain('"units" : liste d\'au moins 2 unités parmi km');
		expect(chapterPrompt(ctx)).toContain('"geometry.pythagoras"');
		const sixth = sheetPrompt({ ...ctx, grade: '6e' });
		expect(sixth).toContain('"units.duration"');
		expect(sixth).not.toContain('"algebra.identities"');
		expect(sheetPrompt({ ...ctx, grade: 'CP' })).not.toContain('"type": "generator"');
	});

	it('leaves a placeholder when the request is empty and skips empty lists', () => {
		const prompt = sheetPrompt({
			...ctx,
			request: ' ',
			group: null,
			existingTitles: [],
			usedIds: []
		});
		expect(prompt).toContain('<précise ici la notion à réviser>');
		expect(prompt).toContain('Chapitre : Calcul numérique.');
		expect(prompt).not.toContain('déjà');
	});

	it('asks for a whole chapter with its title and group', () => {
		const prompt = chapterPrompt(ctx);
		expect(prompt).toContain(
			'{ "format": "pocketclass/chapter@1", "title": "Calcul numérique", "group": "Nombres et calculs", "sheets": [ ...des fiches ] }'
		);
	});
});
