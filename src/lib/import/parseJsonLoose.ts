import { fr } from '#lib/i18n/fr.ts';

export type LooseParseResult = { ok: true; value: unknown } | { ok: false; error: string };

/**
 * Parses JSON pasted from an AI chat: tolerates a Markdown code fence (```json … ```)
 * and any text before the first `{` or after the last `}`.
 */
export function parseJsonLoose(input: string): LooseParseResult {
	const withoutFence = input.replace(/^\s*```[a-zA-Z]*\s*$/gm, '');
	const start = withoutFence.indexOf('{');
	const end = withoutFence.lastIndexOf('}');
	if (start === -1 || end < start) return { ok: false, error: fr.validation.noJsonObject };

	try {
		return { ok: true, value: JSON.parse(withoutFence.slice(start, end + 1)) };
	} catch (error) {
		const detail = error instanceof SyntaxError ? ` (${error.message})` : '';
		return { ok: false, error: fr.validation.invalidJson + detail };
	}
}
