import { describe, expect, it } from 'vitest';
import { validate } from './errors.ts';
import { summarySchema, type SummaryDoc } from './summary.ts';

const summary = {
	format: 'pocketclass/summary@1',
	conceptId: 'maths-3e-fractions',
	code: 'A7K2',
	legible: true,
	transcription: 'Pour simplifier, je divise en haut et en bas.',
	keyPoints: [
		{ id: 'kp-simplify', status: 'acquired' },
		{ id: 'kp-add', status: 'missing', comment: 'Pas abordé.' }
	],
	score: { acquired: 1, total: 2 },
	advice: 'Ajoute un exemple d’addition.'
};

describe('summarySchema', () => {
	it('accepts a valid summary and applies defaults', () => {
		const result = validate(summarySchema, summary);
		expect(result.success).toBe(true);
		const data = (result as { data: SummaryDoc }).data;
		expect(data.errors).toEqual([]);
		expect(data.keyPoints[0].comment).toBe('');
	});

	it('rejects an unknown status', () => {
		const result = validate(summarySchema, {
			...summary,
			keyPoints: [{ id: 'kp-add', status: 'ok' }]
		});
		expect(!result.success && result.errors[0]).toMatch(/^keyPoints\[0\]\.status : /);
	});

	it('rejects a score above the total and duplicate key points', () => {
		const result = validate(summarySchema, {
			...summary,
			keyPoints: [summary.keyPoints[0], summary.keyPoints[0]],
			score: { acquired: 3, total: 2 }
		});
		expect(!result.success && result.errors).toEqual([
			"keyPoints[1].id : l'identifiant « kp-simplify » est utilisé plusieurs fois",
			'score.acquired : score.acquired ne peut pas dépasser score.total'
		]);
	});
});
