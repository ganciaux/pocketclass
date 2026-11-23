import { getDoc, getDocs, query, serverTimestamp, where, writeBatch } from 'firebase/firestore';
import { db } from '#lib/firebase.ts';
import {
	assessmentsCol,
	conceptRef,
	conceptsCol,
	exercisesCol,
	familyDoc,
	pathRef,
	subjectRef
} from '#lib/data/refs.ts';
import type { ImportSource } from '#lib/data/types.ts';
import type { PathDoc } from '#lib/schemas/path.ts';
import {
	chunk,
	findConceptConflicts,
	planImport,
	slugify,
	type ConceptConflict,
	type ExistingState,
	type ImportPlan
} from './importPlan.ts';

// Import is an online, parent-only action: reads here go to the server (getDoc / getDocs)
// so the plan is computed on up-to-date data.

/** Firestore limit is 500 operations per batch; keep a margin. */
const MAX_BATCH_OPS = 450;

export class ImportConflictError extends Error {
	constructor(readonly conflicts: ConceptConflict[]) {
		super(`Concept ids already used by other paths: ${conflicts.map((c) => c.conceptId)}`);
	}
}

const activeIds = (snap: { docs: { id: string; data(): { archived: boolean } }[] }) =>
	snap.docs.filter((d) => !d.data().archived).map((d) => d.id);

/** Concept ids of `path` already used by active concepts of other paths. */
export async function findConflicts(familyId: string, path: PathDoc): Promise<ConceptConflict[]> {
	const snaps = await Promise.all(path.concepts.map((c) => getDoc(conceptRef(familyId, c.id))));
	const owners: Record<string, string> = {};
	for (const snap of snaps) {
		const concept = snap.data();
		if (concept && !concept.archived) owners[snap.id] = concept.pathId;
	}
	return findConceptConflicts(path, owners);
}

export async function readExistingState(familyId: string, path: PathDoc): Promise<ExistingState> {
	const [subjectSnap, pathSnap, conceptsSnap, assessmentsSnap] = await Promise.all([
		getDoc(subjectRef(familyId, slugify(path.subject))),
		getDoc(pathRef(familyId, path.id)),
		getDocs(query(conceptsCol(familyId), where('pathId', '==', path.id))),
		getDocs(query(assessmentsCol(familyId), where('pathId', '==', path.id)))
	]);

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

/**
 * Upserts a validated path into the family catalogue (batched, archives what disappeared).
 * Throws `ImportConflictError` if a concept id belongs to another path.
 * Above 450 operations the batches are not atomic: a failure leaves a partial import that a
 * re-import repairs.
 */
export async function importPath(
	familyId: string,
	path: PathDoc,
	source: ImportSource
): Promise<ImportPlan> {
	const conflicts = await findConflicts(familyId, path);
	if (conflicts.length > 0) throw new ImportConflictError(conflicts);

	const plan = planImport(path, await readExistingState(familyId, path), source);

	for (const ops of chunk(plan.ops, MAX_BATCH_OPS)) {
		const batch = writeBatch(db);
		for (const op of ops) {
			const ref = familyDoc(familyId, ...op.path);
			if (op.kind === 'archive') batch.update(ref, { archived: true });
			else batch.set(ref, op.touch ? { ...op.data, updatedAt: serverTimestamp() } : op.data);
		}
		await batch.commit();
	}
	return plan;
}
