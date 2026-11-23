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

/** What already exists in Firestore for this path (read before planning). */
export interface ExistingState {
	subjectExists: boolean;
	pathVersion: number | null;
	/** Concepts currently attached to this path (archived or not). */
	conceptIds: string[];
	/** Existing exercise ids, per concept id. */
	exerciseIds: Record<string, string[]>;
	/** Assessments currently attached to this path. */
	assessmentIds: string[];
}

/** Path of a document relative to families/{familyId}. */
export type DocPath = [string, ...string[]];

export type WriteOp =
	| { kind: 'set'; path: DocPath; data: Record<string, unknown> }
	| { kind: 'archive'; path: DocPath };

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
	const { id: _id, usage, type, keyPoint, difficulty, ...content } = exercise;
	return { usage, type, keyPoint, difficulty, content, archived: false };
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
 * `updatedAt` is left to the caller (server timestamp).
 */
export function planImport(
	path: PathDoc,
	existing: ExistingState,
	source: ImportSource
): ImportPlan {
	const ops: WriteOp[] = [];
	const subjectId = slugify(path.subject);
	const version = Math.max(path.version, (existing.pathVersion ?? 0) + 1);
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
	ops.push({ kind: 'set', path: [COLLECTIONS.paths, path.id], data: { ...pathRecord } });

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
