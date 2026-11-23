import { describe, expect, it } from 'vitest';
import { parseJsonLoose } from './parseJsonLoose.ts';

describe('parseJsonLoose', () => {
	it('parses plain JSON', () => {
		expect(parseJsonLoose('{"a":1}')).toEqual({ ok: true, value: { a: 1 } });
	});

	it('strips a ```json code fence', () => {
		const input = '```json\n{"a": [1, 2]}\n```';
		expect(parseJsonLoose(input)).toEqual({ ok: true, value: { a: [1, 2] } });
	});

	it('strips a bare ``` fence and surrounding chat text', () => {
		const input = 'Voici le JSON :\n```\n{"a": "}"}\n```\nBonne révision !';
		expect(parseJsonLoose(input)).toEqual({ ok: true, value: { a: '}' } });
	});

	it('keeps backticks inside string values', () => {
		const input = '{"text": "utilise ```code```"}';
		expect(parseJsonLoose(input)).toEqual({ ok: true, value: { text: 'utilise ```code```' } });
	});

	it('reports text without any object', () => {
		const result = parseJsonLoose('rien ici');
		expect(result.ok).toBe(false);
		expect(!result.ok && result.error).toMatch(/Aucun objet JSON/);
	});

	it('reports invalid JSON in French', () => {
		const result = parseJsonLoose('{"a": 1,}');
		expect(result.ok).toBe(false);
		expect(!result.ok && result.error).toMatch(/^Ce texte n'est pas un JSON valide/);
	});
});
