import { COLLECTIONS } from '#lib/data/collections.ts';
import type {
	AssessmentRecord,
	ConceptRecord,
	ExerciseRecord,
	ImportSource,
	PathRecord,
	Subject
} from '#lib/data/types.ts';
import type { Exercise } from '#lib/schemas/common.ts';
import type { ConceptDoc, PathDoc } from '#lib/schemas/path.ts';

/** What already exists in Firestore for this path (read before planning). Active items only. */
export interface ExistingState {
	subjectExists: boolean;
	pathVersion: number | null;
	/** Active concepts attached to this path. */
	conceptIds: string[];
	/** Active exercise ids, per concept id. */
	exerciseIds: Record<string, string[]>;
	/** Active assessments attached to this path. */
	assessmentIds: string[];
}

/** Path of a document relative to families/{familyId}. */
export type DocPath = [string, ...string[]];

export type WriteOp =
	/** `touch`: the executor adds a server `updatedAt` timestamp. */
	| { kind: 'set'; path: DocPath; data: Record<string, unknown>; touch?: true }
	| { kind: 'archive'; path: DocPath };

/** A concept id of the new JSON already used by an active concept of another path. */
export interface ConceptConflict {
	conceptId: string;
	ownerPathId: string;
}

export interface ImportPlan {
	ops: WriteOp[];
	version: number;
	subjectId: string;
	stats: {
		concepts: number;
		exercises: number;
		archivedConcepts: number;
		archivedExercises: number;
	};
}

/** Phase 3 scoring rule, stored with each assessment. */
export const DEFAULT_SCORING = { pointsPerCorrect: 5, perfectBonus: 15 } as const;

const SUBJECT_COLORS = ['#4f46e5', '#0f766e', '#c2410c', '#be185d', '#1d4ed8', '#4d7c0f'];

/** "Mathématiques" → "mathematiques" */
export function slugify(value: string): string {
	return value
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

function colorFor(id: string): string {
	const hash = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
	return SUBJECT_COLORS[hash % SUBJECT_COLORS.length];
}

export function toExerciseRecord(exercise: Exercise): ExerciseRecord {
	const { id: _id, ...record } = exercise;
	return { ...record, archived: false };
}

/** Stored version: never goes backwards, always increases on re-import. */
export const nextVersion = (jsonVersion: number, existingVersion: number | null) =>
	Math.max(jsonVersion, (existingVersion ?? 0) + 1);

/** Counts shown in the import preview. */
export function importStats(concept: ConceptDoc) {
	const count = (usage: Exercise['usage']) =>
		concept.exercises.filter((e) => e.usage === usage).length;
	return {
		keyPoints: concept.keyPoints.length,
		practice: count('practice'),
		assessment: count('assessment')
	};
}

/**
 * Concept ids are family-wide: an id owned by an active concept of ANOTHER path would be
 * silently moved to this one. `owners` maps existing concept ids to their (active) path id.
 */
export function findConceptConflicts(
	path: PathDoc,
	owners: Record<string, string>
): ConceptConflict[] {
	return path.concepts
		.filter((c) => owners[c.id] !== undefined && owners[c.id] !== path.id)
		.map((c) => ({ conceptId: c.id, ownerPathId: owners[c.id] }));
}

function toConceptRecord(
	concept: ConceptDoc,
	order: number,
	pathId: string,
	subjectId: string
): ConceptRecord {
	return {
		pathId,
		subjectId,
		topicId: concept.topic,
		title: concept.title,
		order,
		prerequisites: concept.prerequisites,
		keyPoints: concept.keyPoints,
		sheet: concept.sheet,
		summaryInstruction: concept.summaryInstruction,
		archived: false
	};
}

/**
 * Computes every write needed to upsert `path`: subject (if missing), path, concepts,
 * exercises and assessments. Items missing from the new JSON are archived, never deleted.
 * Conflicts (`findConceptConflicts`) must be checked by the caller before.
 */
export function planImport(
	path: PathDoc,
	existing: ExistingState,
	source: ImportSource
): ImportPlan {
	const ops: WriteOp[] = [];
	const subjectId = slugify(path.subject);
	const version = nextVersion(path.version, existing.pathVersion);
	const archive = (p: DocPath) => ops.push({ kind: 'archive', path: p });
	let exerciseCount = 0;
	let archivedExercises = 0;

	if (!existing.subjectExists) {
		const subject: Subject = { name: path.subject, color: colorFor(subjectId) };
		ops.push({ kind: 'set', path: [COLLECTIONS.subjects, subjectId], data: { ...subject } });
	}

	const pathRecord: Omit<PathRecord, 'updatedAt'> = {
		subjectId,
		title: path.title,
		grade: path.grade,
		type: path.type,
		topics: path.topics.map((t, order) => ({ id: t.id, title: t.title, order })),
		source,
		version
	};
	ops.push({
		kind: 'set',
		path: [COLLECTIONS.paths, path.id],
		data: { ...pathRecord },
		touch: true
	});

	const newConceptIds = new Set(path.concepts.map((c) => c.id));
	const assessedConceptIds = new Set<string>();

	path.concepts.forEach((concept, order) => {
		const conceptPath: DocPath = [COLLECTIONS.concepts, concept.id];
		ops.push({
			kind: 'set',
			path: conceptPath,
			data: { ...toConceptRecord(concept, order, path.id, subjectId) }
		});

		for (const exercise of concept.exercises) {
			ops.push({
				kind: 'set',
				path: [...conceptPath, COLLECTIONS.exercises, exercise.id],
				data: { ...toExerciseRecord(exercise) }
			});
			exerciseCount++;
		}
		const newExerciseIds = new Set(concept.exercises.map((e) => e.id));
		for (const oldId of existing.exerciseIds[concept.id] ?? []) {
			if (!newExerciseIds.has(oldId)) {
				archive([...conceptPath, COLLECTIONS.exercises, oldId]);
				archivedExercises++;
			}
		}

		if (concept.assessment) {
			assessedConceptIds.add(concept.id);
			const assessment: AssessmentRecord = {
				...concept.assessment,
				pathId: path.id,
				conceptIds: [concept.id],
				scoring: { ...DEFAULT_SCORING },
				archived: false
			};
			ops.push({
				kind: 'set',
				path: [COLLECTIONS.assessments, concept.id],
				data: { ...assessment }
			});
		}
	});

	const archivedConceptIds = existing.conceptIds.filter((id) => !newConceptIds.has(id));
	for (const id of archivedConceptIds) archive([COLLECTIONS.concepts, id]);

	for (const id of existing.assessmentIds) {
		if (!assessedConceptIds.has(id)) archive([COLLECTIONS.assessments, id]);
	}

	return {
		ops,
		version,
		subjectId,
		stats: {
			concepts: path.concepts.length,
			exercises: exerciseCount,
			archivedConcepts: archivedConceptIds.length,
			archivedExercises
		}
	};
}

/** Splits operations into chunks that fit in one Firestore batch. */
export function chunk<T>(items: T[], size: number): T[][] {
	const chunks: T[][] = [];
	for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
	return chunks;
}
