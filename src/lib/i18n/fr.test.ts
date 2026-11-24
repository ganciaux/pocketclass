import { describe, expect, it } from 'vitest';
import { fr, plural } from './fr.ts';

describe('plural', () => {
	it('uses the singular for 0 and 1, like French', () => {
		expect(plural(0, 'notion')).toBe('0 notion');
		expect(plural(1, 'notion')).toBe('1 notion');
		expect(plural(2, 'notion')).toBe('2 notions');
		expect(plural(3, 'point-clé', 'points-clés')).toBe('3 points-clés');
	});

	it('is used by the import messages', () => {
		expect(fr.import.done(2, 1)).toBe('Import terminé : 2 fiches ajoutées, 1 fiche mise à jour.');
		expect(fr.import.sheetLine(1, 0, 2)).toBe(
			"1 point-clé · 0 exercice d'entraînement · 2 exercices de contrôle"
		);
	});
});
