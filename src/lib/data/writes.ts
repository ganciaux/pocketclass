/**
 * Writes made by children (progress, notes, profile look) must work offline: Firestore applies
 * them to the local cache at once (live sources update immediately) and syncs later, but the
 * promise only settles on the server acknowledgement. So they are not awaited. A failure (e.g.
 * a rule rejection, which Firestore also rolls back locally) is logged and reported to the
 * listeners (`<WriteErrorToast>` tells the user).
 */

export interface WriteFailure {
	/** What was written (English, for the logs; `practice …` = a finished run). */
	label: string;
	/** Firestore error code (`permission-denied`…), when there is one. */
	code: string | null;
}

const listeners = new Set<(failure: WriteFailure) => void>();

/** Calls `listener` on each failed background write; returns the unsubscribe function. */
export function onWriteFailure(listener: (failure: WriteFailure) => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function inBackground(write: Promise<unknown>, label: string): void {
	write.catch((error: unknown) => {
		console.error(`[write] ${label}`, error);
		const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : null;
		for (const listener of listeners) listener({ label, code });
	});
}
