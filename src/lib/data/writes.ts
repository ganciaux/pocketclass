/**
 * Writes made by children (progress, notes, profile look) must work offline: Firestore applies
 * them to the local cache at once (live sources update immediately) and syncs later, but the
 * promise only settles on the server acknowledgement. So they are not awaited: errors (e.g. a
 * rule rejection, which Firestore also rolls back locally) are logged.
 */
export function inBackground(write: Promise<unknown>, label: string): void {
	write.catch((error) => console.error(`[write] ${label}`, error));
}
