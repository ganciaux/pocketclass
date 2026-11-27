import { describe, expect, it } from 'vitest';
import {
	coursePrompt,
	idPrefix,
	sheetPrompt,
	type CourseContext,
	type PromptContext
} from './sheetPrompt.ts';

const course: CourseContext = {
	subject: 'Anglais',
	grade: '4e',
	request: 'voir les 6 photos jointes',
	existingChapters: [{ title: 'Present simple', group: 'Grammaire' }],
	usedIds: ['anglais-4e-present']
};

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

	it('asks for a mind map with short leaves per key point', () => {
		const prompt = sheetPrompt(ctx);
		expect(prompt).toContain('"mindMap"');
		expect(prompt).toContain('1 à 4 feuilles');
	});

	it('asks for revision cards with a few pitfalls, checked before writing', () => {
		const prompt = sheetPrompt(ctx);
		expect(prompt).toContain('"flashcards"');
		expect(prompt).toContain('2 ou 3 cartes "pitfall"');
		expect(prompt).toContain("Vérifie l'exactitude");
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
		expect(coursePrompt({ ...course, subject: 'Mathématiques', grade: '3e' })).toContain(
			'"geometry.pythagoras"'
		);
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

	it('asks for a course split into chapters, one per big theme, none too thin', () => {
		const prompt = coursePrompt(course);
		expect(prompt).toContain('"format": "pocketclass/chapters@1", "chapters": [');
		expect(prompt).toContain('Un chapitre = un grand thème du cours');
		expect(prompt).toContain('« Thème 1 + Thème 2 »');
		expect(prompt).toContain('au moins 2 fiches par chapitre');
		expect(prompt).toContain('12 chapitres au plus');
		expect(prompt).toContain('Contenu du cours : voir les 6 photos jointes.');
	});

	it('gives the course prompt the chapters, parts and ids already there', () => {
		const prompt = coursePrompt(course);
		expect(prompt).toContain('à ne pas refaire) : Present simple (Grammaire).');
		expect(prompt).toContain('Parties déjà utilisées pour "group" : Grammaire.');
		expect(prompt).toContain('anglais-4e-present');
		expect(prompt).toContain('commencent par "anglais-4e-"');
		const empty = coursePrompt({ ...course, request: '', existingChapters: [], usedIds: [] });
		expect(empty).toContain('<précise ici les thèmes et notions, ou joins les photos du cours>');
		expect(empty).not.toContain('déjà');
	});
});
