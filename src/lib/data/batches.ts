import { writeBatch, type DocumentReference } from 'firebase/firestore';
import { db } from '#lib/firebase.ts';
import { chunk } from '#lib/import/sheetPlan.ts';

/** Firestore limit is 500 operations per batch; keep a margin. */
export const MAX_BATCH_OPS = 450;

/** Deletes documents in order, in batches (online: awaited). */
export async function deleteInBatches(refs: DocumentReference[]): Promise<void> {
	for (const part of chunk(refs, MAX_BATCH_OPS)) {
		const batch = writeBatch(db);
		for (const ref of part) batch.delete(ref);
		await batch.commit();
	}
}
