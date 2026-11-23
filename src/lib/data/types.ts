import type { Timestamp } from 'firebase/firestore';
import type { Exercise } from '#lib/schemas/common.ts';
import type { AssessmentDoc, KeyPoint, PATH_TYPES, SheetSection } from '#lib/schemas/path.ts';

export type PathType = (typeof PATH_TYPES)[number];

/** School grades, used as stable values (the label shown in the UI is the same string). */
export const GRADES = ['6e', '5e', '4e', '3e'] as const;
export type Grade = (typeof GRADES)[number];

export type ProfileRole = 'admin' | 'child';

/** users/{uid}: index to find the user's family. */
export interface UserIndex {
	familyId: string;
	profileId: string;
}

/** families/{familyId} */
export interface Family {
	name: string;
	admins: string[];
	createdAt: Timestamp;
}

/** families/{familyId}/profiles/{profileId} */
export interface Profile {
	firstName: string;
	role: ProfileRole;
	grade: Grade | null;
	points: number;
}

/** families/{familyId}/profiles/{profileId}/assignments/{pathId} */
export interface Assignment {
	since: Timestamp;
	dueDate?: string;
}

/** families/{familyId}/subjects/{subjectId} */
export interface Subject {
	name: string;
	color: string;
}

/** families/{familyId}/paths/{pathId} */
export interface PathRecord {
	subjectId: string;
	title: string;
	grade: string;
	type: PathType;
	topics: { id: string; title: string; order: number }[];
	source: ImportSource;
	version: number;
	updatedAt: Timestamp;
}

/** families/{familyId}/concepts/{conceptId} */
export interface ConceptRecord {
	pathId: string;
	subjectId: string;
	topicId: string;
	title: string;
	order: number;
	prerequisites: string[];
	keyPoints: KeyPoint[];
	sheet: { sections: SheetSection[]; pitfalls: string[] };
	summaryInstruction?: string;
	archived: boolean;
}

/** families/{familyId}/concepts/{conceptId}/exercises/{exerciseId} */
export interface ExerciseRecord {
	usage: Exercise['usage'];
	type: Exercise['type'];
	keyPoint: string;
	difficulty: Exercise['difficulty'];
	/** Type-specific fields (front/back, question/answer/distractors...). */
	content: Record<string, unknown>;
	archived: boolean;
}

/** families/{familyId}/assessments/{assessmentId} (id = concept id in phase 1) */
export interface AssessmentRecord extends AssessmentDoc {
	pathId: string;
	conceptIds: string[];
	scoring: { pointsPerCorrect: number; perfectBonus: number };
	archived: boolean;
}

export type ImportSource = 'paste' | 'sample';

/** A Firestore document with its id. */
export type WithId<T> = T & { id: string };
