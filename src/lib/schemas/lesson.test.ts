import { describe, expect, it } from 'vitest';
import { validate } from './errors.ts';
import { lessonSchema } from './lesson.ts';

const lesson = {
	format: 'pocketclass/lesson@1',
	subject: 'Français',
	title: 'Le présent',
	grade: '6e',
	dueDate: '2026-12-01',
	exercises: [
		{ type: 'cloze', text: 'Nous [[mangeons]].' },
		{ type: 'pair', front: 'manger', back: 'nous mangeons', direction: 'both' }
	]
};

describe('lessonSchema', () => {
	it('accepts exercises without id, usage or keyPoint', () => {
		const result = validate(lessonSchema, lesson);
		expect(result.success).toBe(true);
	});

	it('rejects an invalid due date', () => {
		const result = validate(lessonSchema, { ...lesson, dueDate: '01/12/2026' });
		expect(result.success).toBe(false);
		expect(!result.success && result.errors[0]).toMatch(/^dueDate : /);
	});

	it('requires at least one exercise', () => {
		const result = validate(lessonSchema, { ...lesson, exercises: [] });
		expect(!result.success && result.errors[0]).toMatch(/^exercises : Trop petit/);
	});
});
