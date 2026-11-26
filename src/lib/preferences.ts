/**
 * Small per-device choices (e.g. the sheet's « Détails | Résumé » view) in `localStorage`.
 * Storage may be missing or blocked (private mode): reads fall back, writes are skipped.
 */
export function readPreference(key: string): string | null {
	try {
		return localStorage.getItem(`pocketclass.${key}`);
	} catch {
		return null;
	}
}

export function clearPreference(key: string): void {
	try {
		localStorage.removeItem(`pocketclass.${key}`);
	} catch {
		// Nothing stored, nothing to clear.
	}
}

export function writePreference(key: string, value: string): void {
	try {
		localStorage.setItem(`pocketclass.${key}`, value);
	} catch {
		// Not remembered: the choice still applies to this page.
	}
}
