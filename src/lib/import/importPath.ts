import {
	doc,
	getDoc,
	getDocs,
	query,
	serverTimestamp,
	where,
	writeBatch
} from 'firebase/firestore';
import { db } from '#lib/firebase.ts';
import { assessmentsCol, conceptsCol, exercisesCol, pathRef, subjectRef } from '#lib/data/refs.ts';
import type { ImportSource } from '#lib/data/types.ts';
import type { PathDoc } from '#lib/schemas/path.ts';
import { COLLECTIONS } from '#lib/data/collections.ts';
import { chunk, planImport, slugify, type ExistingState, type ImportPlan } from './importPlan.ts';

/** Firestore limit is 500 operations per batch; keep a margin. */
const MAX_BATCH_OPS = 450;

export async function readExistingState(familyId: string, path: PathDoc): Promise<ExistingState> {
	const [subjectSnap, pathSnap, conceptsSnap, assessmentsSnap] = await Promise.all([
		getDoc(subjectRef(familyId, slugify(path.subject))),
		getDoc(pathRef(familyId, path.id)),
		getDocs(query(conceptsCol(familyId), where('pathId', '==', path.id))),
		getDocs(query(assessmentsCol(familyId), where('pathId', '==', path.id)))
	]);

	// Only active (non-archived) items: they are the ones that may need archiving.
	const activeIds = (snap: { docs: { id: string; data(): { archived: boolean } }[] }) =>
		snap.docs.filter((d) => !d.data().archived).map((d) => d.id);

	// Exercises of the concepts present in the new JSON (archived concepts keep theirs as is).
	const exerciseIds: Record<string, string[]> = {};
	await Promise.all(
		path.concepts.map(async ({ id }) => {
			exerciseIds[id] = activeIds(await getDocs(exercisesCol(familyId, id)));
		})
	);

	return {
		subjectExists: subjectSnap.exists(),
		pathVersion: pathSnap.exists() ? pathSnap.data().version : null,
		conceptIds: activeIds(conceptsSnap),
		exerciseIds,
		assessmentIds: activeIds(assessmentsSnap)
	};
}

/** Upserts a validated path into the family catalogue (batched, archives what disappeared). */
export async function importPath(
	familyId: string,
	path: PathDoc,
	source: ImportSource
): Promise<ImportPlan> {
	const existing = await readExistingState(familyId, path);
	const plan = planImport(path, existing, source);

	for (const ops of chunk(plan.ops, MAX_BATCH_OPS)) {
		const batch = writeBatch(db);
		for (const op of ops) {
			const ref = doc(db, 'families', familyId, ...op.path);
			if (op.kind === 'archive') {
				batch.update(ref, { archived: true });
			} else if (op.path[0] === COLLECTIONS.paths) {
				batch.set(ref, { ...op.data, updatedAt: serverTimestamp() });
			} else {
				batch.set(ref, op.data);
			}
		}
		await batch.commit();
	}
	return plan;
}
