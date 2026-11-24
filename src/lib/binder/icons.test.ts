import { describe, expect, it } from 'vitest';
import { SUBJECT_ICONS } from '#lib/data/types.ts';
import { ICON_PATHS, subjectIcon, suggestIcon } from './icons.ts';

describe('suggestIcon', () => {
	it.each([
		['Mathématiques', 'calculator'],
		['Français', 'book'],
		['Anglais LV1', 'languages'],
		['Histoire-Géographie', 'landmark'],
		['Géographie', 'globe'],
		['Physique-Chimie', 'flask'],
		['SVT', 'leaf'],
		['Technologie', 'laptop'],
		['Éducation musicale', 'music'],
		['Arts plastiques', 'palette'],
		['EPS', 'dumbbell'],
		['Brevet blanc', 'star']
	])('%s → %s', (name, icon) => {
		expect(suggestIcon(name)).toBe(icon);
	});
});

describe('subjectIcon', () => {
	it('prefers the chosen icon', () => {
		expect(subjectIcon({ name: 'Mathématiques', icon: 'pi' })).toBe('pi');
		expect(subjectIcon({ name: 'Mathématiques' })).toBe('calculator');
	});
});

it('draws every icon', () => {
	for (const icon of SUBJECT_ICONS) expect(ICON_PATHS[icon].length).toBeGreaterThan(0);
});
