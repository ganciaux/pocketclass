import {
	getDocFromServer,
	onSnapshot,
	type DocumentReference,
	type DocumentSnapshot,
	type Query
} from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import type { WithId } from './types.ts';

/** True for a rules rejection (e.g. a device unlinked by the parent). */
export const isPermissionDenied = (error: unknown) =>
	error instanceof FirebaseError && error.code === 'permission-denied';

/**
 * Cache-first reads. `onSnapshot` emits cached data immediately (then server updates), whereas
 * `getDoc` waits for the server and only falls back to the cache after a timeout when offline.
 * Components consume `Subscribe` sources through `live()` (live.svelte.ts).
 */

/** A live source: calls `onData` on every change, returns the unsubscribe function. */
export type Subscribe<T> = (
	onData: (value: T) => void,
	onError: (error: Error) => void
) => () => void;

/** Live document; `select` may return null to treat it as missing (e.g. archived). */
export function docSource<T>(
	ref: DocumentReference<T>,
	select: (doc: WithId<T>) => WithId<T> | null = (doc) => doc
): Subscribe<WithId<T> | null> {
	return (onData, onError) =>
		onSnapshot(
			ref,
			(snap) => onData(snap.exists() ? select({ id: snap.id, ...snap.data() }) : null),
			onError
		);
}

/** Live query; `select` may filter or sort the documents. */
export function querySource<T>(
	query: Query<T>,
	select: (docs: WithId<T>[]) => WithId<T>[] = (docs) => docs
): Subscribe<WithId<T>[]> {
	return (onData, onError) =>
		onSnapshot(
			query,
			(snap) => onData(select(snap.docs.map((d) => ({ id: d.id, ...d.data() })))),
			onError
		);
}

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
