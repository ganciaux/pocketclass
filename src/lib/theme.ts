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

export function setTheme(choice: ThemeChoice): void {
	writePreference('theme', choice);
	const root = document.documentElement;
	if (choice === 'auto') delete root.dataset.theme;
	else root.dataset.theme = THEME_NAMES[choice];
}
