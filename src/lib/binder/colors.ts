import type { SubjectColor } from '#lib/data/types.ts';

// Tailwind classes of each subject colour, written in full so Tailwind generates them.

/** Left border of a subject card. */
export const SUBJECT_BORDER: Record<SubjectColor, string> = {
	amber: 'border-amber-500',
	blue: 'border-blue-500',
	emerald: 'border-emerald-500',
	rose: 'border-rose-500',
	violet: 'border-violet-500',
	cyan: 'border-cyan-500',
	orange: 'border-orange-500',
	lime: 'border-lime-500'
};

/** Colour swatch (subject form, lists). */
export const SUBJECT_SWATCH: Record<SubjectColor, string> = {
	amber: 'bg-amber-500',
	blue: 'bg-blue-500',
	emerald: 'bg-emerald-500',
	rose: 'bg-rose-500',
	violet: 'bg-violet-500',
	cyan: 'bg-cyan-500',
	orange: 'bg-orange-500',
	lime: 'bg-lime-500'
};
