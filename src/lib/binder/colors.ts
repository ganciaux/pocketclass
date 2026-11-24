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

/** Icon tile: soft tint of the colour, icon in a shade readable in both themes. */
export const SUBJECT_TILE: Record<SubjectColor, string> = {
	amber: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
	blue: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
	emerald: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
	rose: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
	violet: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
	cyan: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300',
	orange: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
	lime: 'bg-lime-500/15 text-lime-700 dark:text-lime-300'
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
