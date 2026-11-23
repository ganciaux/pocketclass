import { z } from 'zod';
import { fr } from '#lib/i18n/fr.ts';

export type ValidationResult<T> = { success: true; data: T } | { success: false; errors: string[] };

const frenchErrors = z.locales.fr().localeError;

/** `concepts[0].exercises[3].keyPoint` */
export function formatPath(path: PropertyKey[]): string {
	if (path.length === 0) return fr.validation.root;
	return path
		.map((key, i) => (typeof key === 'number' ? `[${key}]` : `${i === 0 ? '' : '.'}${String(key)}`))
		.join('');
}

export function formatIssues(issues: z.core.$ZodIssue[]): string[] {
	return issues.map((issue) => `${formatPath(issue.path)} : ${issue.message}`);
}

/** Validates `data` and returns French messages prefixed with the field path. */
export function validate<S extends z.ZodType>(
	schema: S,
	data: unknown
): ValidationResult<z.infer<S>> {
	const result = schema.safeParse(data, { error: frenchErrors });
	return result.success
		? { success: true, data: result.data }
		: { success: false, errors: formatIssues(result.error.issues) };
}
