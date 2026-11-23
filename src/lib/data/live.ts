import {
	getDocFromServer,
	onSnapshot,
	type DocumentReference,
	type DocumentSnapshot,
	type Query,
	type QuerySnapshot
} from 'firebase/firestore';

/**
 * Cache-first reads. `onSnapshot` emits cached data immediately (then server updates), whereas
 * `getDoc` waits for the server and only falls back to the cache after a timeout when offline.
 */

/** Resolves with the first snapshot (from the local cache if the document is cached). */
export function firstSnapshot<T>(ref: DocumentReference<T>): Promise<DocumentSnapshot<T>> {
	return new Promise((resolve, reject) => {
		const unsubscribe = onSnapshot(
			ref,
			(snap) => {
				unsubscribe();
				resolve(snap);
			},
			reject
		);
	});
}

/**
 * One-shot cache-first read that can be trusted when the document is MISSING: a cache miss is
 * confirmed with the server (throws when offline) instead of being reported as "not found".
 */
export async function getDocCacheFirst<T>(ref: DocumentReference<T>): Promise<T | null> {
	const first = await firstSnapshot(ref);
	if (first.exists()) return first.data();
	if (!first.metadata.fromCache) return null;
	const server = await getDocFromServer(ref);
	return server.exists() ? server.data() : null;
}

/** Live document: calls `onData` on every change. Returns the unsubscribe function. */
export function watchDoc<T>(
	ref: DocumentReference<T>,
	onData: (data: (T & { id: string }) | null) => void,
	onError: (error: Error) => void
): () => void {
	return onSnapshot(
		ref,
		(snap) => onData(snap.exists() ? { id: snap.id, ...snap.data() } : null),
		onError
	);
}

/** Live query: calls `onData` with every document on each change. */
export function watchQuery<T>(
	query: Query<T>,
	onData: (docs: (T & { id: string })[], snap: QuerySnapshot<T>) => void,
	onError: (error: Error) => void
): () => void {
	return onSnapshot(
		query,
		(snap) =>
			onData(
				snap.docs.map((d) => ({ id: d.id, ...d.data() })),
				snap
			),
		onError
	);
}
