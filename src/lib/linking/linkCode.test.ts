import { describe, expect, it } from 'vitest';
import {
	formatLinkCode,
	generateLinkCode,
	LINK_CODE_ALPHABET,
	LINK_CODE_LENGTH,
	normalizeLinkCode
} from './linkCode.ts';

describe('generateLinkCode', () => {
	it('returns a code of the expected length from the alphabet', () => {
		for (let i = 0; i < 50; i++) {
			const code = generateLinkCode();
			expect(code).toHaveLength(LINK_CODE_LENGTH);
			expect([...code].every((c) => LINK_CODE_ALPHABET.includes(c))).toBe(true);
		}
	});

	it('maps random bytes onto the alphabet', () => {
		const code = generateLinkCode((bytes) => bytes.fill(31 + 2)); // 33 % 31 = 2
		expect(code).toBe('444444');
	});
});

describe('normalizeLinkCode', () => {
	it('accepts lower case, spaces and dashes', () => {
		expect(normalizeLinkCode(' abc-def ')).toBe('ABCDEF');
		expect(normalizeLinkCode('abc def')).toBe('ABCDEF');
	});

	it('rejects wrong lengths and ambiguous characters', () => {
		expect(normalizeLinkCode('ABCDE')).toBeNull();
		expect(normalizeLinkCode('ABCDEFG')).toBeNull();
		expect(normalizeLinkCode('ABCDE0')).toBeNull();
		expect(normalizeLinkCode('ABCDEI')).toBeNull();
	});
});

it('formatLinkCode splits the code in two groups', () => {
	expect(formatLinkCode('ABCDEF')).toBe('ABC DEF');
});
