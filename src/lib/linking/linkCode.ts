/**
 * Device link codes: short-lived codes a parent shows and a child types to link their phone.
 * Pure module (unit-tested). Storage and rules: data/devices.ts, firestore.rules (linkCodes).
 */

/** No ambiguous characters (0/O, 1/I/L): the code is read on one screen and typed on another. */
export const LINK_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const LINK_CODE_LENGTH = 6;
/** Must stay below the 15 minutes accepted by the rules. */
export const LINK_CODE_TTL_MS = 10 * 60 * 1000;

/** Random code from a CSPRNG (31^6 ≈ 887 million codes, each valid 10 minutes). */
export function generateLinkCode(
	fillRandom: (bytes: Uint8Array<ArrayBuffer>) => void = (bytes) => crypto.getRandomValues(bytes)
): string {
	const bytes = new Uint8Array(LINK_CODE_LENGTH);
	fillRandom(bytes);
	// 256 % 31 ≠ 0: the slight bias is irrelevant for a 10-minute code.
	return Array.from(bytes, (b) => LINK_CODE_ALPHABET[b % LINK_CODE_ALPHABET.length]).join('');
}

/** What the child typed → canonical code, or null if it cannot be a code. */
export function normalizeLinkCode(input: string): string | null {
	const code = input.toUpperCase().replace(/[\s-]/g, '');
	if (code.length !== LINK_CODE_LENGTH) return null;
	return [...code].every((c) => LINK_CODE_ALPHABET.includes(c)) ? code : null;
}

/** Display form, easier to read aloud: "ABC DEF". */
export const formatLinkCode = (code: string) => `${code.slice(0, 3)} ${code.slice(3)}`;
