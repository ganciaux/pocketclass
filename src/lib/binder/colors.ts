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

/** Light wash of the colour (subject header banner). */
export const SUBJECT_TINT: Record<SubjectColor, string> = {
	amber: 'bg-amber-500/10',
	blue: 'bg-blue-500/10',
	emerald: 'bg-emerald-500/10',
	rose: 'bg-rose-500/10',
	violet: 'bg-violet-500/10',
	cyan: 'bg-cyan-500/10',
	orange: 'bg-orange-500/10',
	lime: 'bg-lime-500/10'
};

/** Text (and `currentColor`: progress bars, icons) in the colour. */
export const SUBJECT_TEXT: Record<SubjectColor, string> = {
	amber: 'text-amber-600 dark:text-amber-400',
	blue: 'text-blue-600 dark:text-blue-400',
	emerald: 'text-emerald-600 dark:text-emerald-400',
	rose: 'text-rose-600 dark:text-rose-400',
	violet: 'text-violet-600 dark:text-violet-400',
	cyan: 'text-cyan-600 dark:text-cyan-400',
	orange: 'text-orange-600 dark:text-orange-400',
	lime: 'text-lime-600 dark:text-lime-400'
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
