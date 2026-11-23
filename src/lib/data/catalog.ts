import { query, where } from 'firebase/firestore';
import { conceptsCol, pathsCol } from './refs.ts';
import type { ConceptRecord, WithId } from './types.ts';

export const allPathsQuery = (familyId: string) => pathsCol(familyId);

/** Concepts of a path. Archived ones and ordering are handled client-side (no composite index). */
export const conceptsOfPathQuery = (familyId: string, pathId: string) =>
	query(conceptsCol(familyId), where('pathId', '==', pathId));

export function activeConceptsInOrder(concepts: WithId<ConceptRecord>[]): WithId<ConceptRecord>[] {
	return concepts.filter((c) => !c.archived).sort((a, b) => a.order - b.order);
}
