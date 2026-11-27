/**
 * Point names of a geometry figure, as written in a French school book: a capital letter,
 * optionally followed by a digit or a prime (A, B, A', O1). A segment is two names glued
 * together (« AB », « A'B' »), an angle three (« BAC »: the vertex in the middle). Pure module
 * (unit-tested).
 */

export const POINT_NAME = /^[A-Z][0-9']?$/;
const NAME = /[A-Z][0-9']?/g;

/** « A'BC » → ['A'', 'B', 'C']; null when the text is not only point names. */
export function splitNames(text: string): string[] | null {
	const names = text.match(NAME) ?? [];
	return names.join('') === text ? names : null;
}
