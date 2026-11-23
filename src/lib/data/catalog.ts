import { query, where } from 'firebase/firestore';
import { docSource, firstSnapshot, querySource, type Subscribe } from './sources.ts';
import { assignmentsCol, conceptRef, conceptsCol, pathRef, pathsCol } from './refs.ts';
import type { PathRecord, WithId } from './types.ts';

// Live sources of the family catalogue, consumed by pages through `live()`.
// Archived items are filtered and sorted client-side (no composite index needed).

const active = <T extends { archived: boolean }>(doc: T) => (doc.archived ? null : doc);
const byTitle = (paths: WithId<PathRecord>[]) =>
	[...paths].sort((a, b) => a.title.localeCompare(b.title));

export const watchPath = (familyId: string, pathId: string) => docSource(pathRef(familyId, pathId));

export const watchFamilyPaths = (familyId: string) => querySource(pathsCol(familyId), byTitle);

export const watchConcept = (familyId: string, conceptId: string) =>
	docSource(conceptRef(familyId, conceptId), active);

export const watchConceptsOfPath = (familyId: string, pathId: string) =>
	querySource(query(conceptsCol(familyId), where('pathId', '==', pathId)), (concepts) =>
		concepts.filter((c) => !c.archived).sort((a, b) => a.order - b.order)
	);

/** Every active concept of the family (dashboard: progress of several paths at once). */
export const watchActiveConcepts = (familyId: string) =>
	querySource(query(conceptsCol(familyId), where('archived', '==', false)));

/** Paths assigned to a profile (live on the assignments, path documents read cache-first). */
export function watchAssignedPaths(
	familyId: string,
	profileId: string
): Subscribe<WithId<PathRecord>[]> {
	return (onData, onError) => {
		// Only the latest snapshot may publish: each snapshot (and the cleanup) bumps `run`,
		// so a slower previous result, or one arriving after unsubscribe, is dropped.
		let run = 0;
		const stop = querySource(assignmentsCol(familyId, profileId))(async (assignments) => {
			const current = ++run;
			try {
				const snaps = await Promise.all(
					assignments.map((a) => firstSnapshot(pathRef(familyId, a.id)))
				);
				const paths = snaps.filter((s) => s.exists()).map((s) => ({ id: s.id, ...s.data()! }));
				if (current === run) onData(byTitle(paths));
			} catch (error) {
				if (current === run) onError(error as Error);
			}
		}, onError);
		return () => {
			run++;
			stop();
		};
	};
}
