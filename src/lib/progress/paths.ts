import type { ConceptRecord, PathRecord, WithId } from '#lib/data/types.ts';

/** Path reading order and progress. Pure module (unit-tested). */

type PathLike = Pick<WithId<PathRecord>, 'id' | 'title' | 'topics'>;
type ConceptLike = Pick<WithId<ConceptRecord>, 'id' | 'title' | 'pathId' | 'topicId' | 'order'>;

/** Topics in order, each with its concepts in order (the mission map). */
export function topicsOf<C extends ConceptLike>(path: PathLike, concepts: C[]) {
	return [...path.topics]
		.sort((a, b) => a.order - b.order)
		.map((topic) => ({
			...topic,
			concepts: concepts
				.filter((c) => c.pathId === path.id && c.topicId === topic.id)
				.sort((a, b) => a.order - b.order)
		}));
}

export interface PathProgress {
	pathId: string;
	title: string;
	total: number;
	read: number;
	/** First unread concept in map order, null when everything is read. */
	next: { id: string; title: string } | null;
}

/** Reading progress of each path (concepts of unknown topics are ignored, like on the map). */
export function pathProgress(
	paths: PathLike[],
	concepts: ConceptLike[],
	readIds: ReadonlySet<string>
): PathProgress[] {
	return paths.map((path) => {
		const ordered = topicsOf(path, concepts).flatMap((topic) => topic.concepts);
		const next = ordered.find((c) => !readIds.has(c.id));
		return {
			pathId: path.id,
			title: path.title,
			total: ordered.length,
			read: ordered.filter((c) => readIds.has(c.id)).length,
			next: next ? { id: next.id, title: next.title } : null
		};
	});
}
