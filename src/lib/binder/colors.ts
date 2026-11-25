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

// Sheet statuses, « school pencil case » charter (CLAUDE.md, styling): new = blue pen,
// opened = pencil grey, read = soft green, acquired = the teacher's green, failed = red. The
// filter chip, the badge and the path step of a status share its colour.

type StatusKey = 'new' | 'updated' | 'opened' | 'read' | 'acquired' | 'failed';

/** Filter chip of the chapter page, off (outlined) and on (filled); `all` is plain ink. */
export const STATUS_CHIP: Record<StatusKey | 'all', { off: string; on: string }> = {
	all: { off: 'btn-outline', on: 'btn-neutral' },
	new: { off: 'btn-outline btn-secondary', on: 'btn-secondary' },
	updated: { off: 'btn-outline btn-secondary', on: 'btn-secondary' },
	opened: {
		off: 'btn-outline border-base-content/30 text-base-content/70',
		on: 'bg-base-300 border-base-300 text-base-content'
	},
	read: { off: 'btn-outline btn-success', on: 'btn-soft btn-success' },
	acquired: { off: 'btn-outline btn-success', on: 'btn-success' },
	failed: { off: 'btn-outline btn-error', on: 'btn-error' }
};

/** Badge of a sheet in a list. */
export const STATUS_BADGE: Record<StatusKey, string> = {
	new: 'badge-secondary',
	updated: 'badge-secondary badge-soft',
	opened: 'badge-ghost',
	read: 'badge-success badge-soft',
	acquired: 'badge-success',
	failed: 'badge-error'
};

/** Step marker of the chapter path (`new`: the subject's own tile, see the chapter page). */
export const STATUS_STEP: Record<Exclude<StatusKey, 'new' | 'updated'>, string> = {
	opened: 'border-2 border-base-content/30 bg-base-100 text-base-content/70',
	read: 'bg-success/15 text-success',
	acquired: 'bg-success text-success-content',
	failed: 'border-2 border-dashed border-error bg-base-100 text-error'
};
