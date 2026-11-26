import { readPreference, writePreference } from './preferences.ts';

/**
 * Day / night: « auto » follows the phone (daisyUI `prefersdark`), « light » / « dark » force
 * a theme with `data-theme` on <html>. Remembered on the device; `app.html` applies it before
 * the first paint (same key and theme names: keep them in sync).
 */
export const THEME_CHOICES = ['auto', 'light', 'dark'] as const;
export type ThemeChoice = (typeof THEME_CHOICES)[number];

const THEME_NAMES = { light: 'pocketclass-light', dark: 'pocketclass-dark' } as const;

export function readTheme(): ThemeChoice {
	const stored = readPreference('theme');
	return THEME_CHOICES.find((choice) => choice === stored) ?? 'auto';
}

/** Status bar colour of each theme (the slate header strip), as in `app.html`. */
const BAR_COLORS = { light: '#1f2127', dark: '#131418' } as const;

export function setTheme(choice: ThemeChoice): void {
	writePreference('theme', choice);
	const root = document.documentElement;
	if (choice === 'auto') delete root.dataset.theme;
	else root.dataset.theme = THEME_NAMES[choice];
	// Auto: each meta keeps the colour of its media query; forced: both take the chosen one.
	for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
		const own = meta.media.includes('dark') ? BAR_COLORS.dark : BAR_COLORS.light;
		meta.content = choice === 'auto' ? own : BAR_COLORS[choice];
	}
}
