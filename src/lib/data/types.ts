import type { Timestamp } from 'firebase/firestore';
import type { Exercise } from '#lib/schemas/common.ts';
import type { AssessmentDoc, ConceptDoc, PathDoc } from '#lib/schemas/path.ts';

// Storage shapes. Nested content types are derived from the Zod import schemas, so a schema
// change flows here; only storage-specific fields (order, archived, ids...) are declared.

export type PathType = PathDoc['type'];

/** `Omit` applied to each member of a union (keeps the discriminated union intact). */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

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

/** linkCodes/{code}: short-lived code to link a child device (top level: the child has no family yet). */
export interface LinkCode {
	familyId: string;
	profileId: string;
	expiresAt: Timestamp;
}

/** families/{familyId}/devices/{uid}: a child device (anonymous account) acting as a profile. */
export interface Device {
	profileId: string;
	linkedAt: Timestamp;
	/** The link code used (checked by the rules when the device is created). */
	code: string;
}

/** families/{familyId}/profiles/{profileId} */
export interface Profile {
	firstName: string;
	role: ProfileRole;
	grade: Grade | null;
	points: number;
	/** Chosen by the child; shown instead of the first name. */
	nickname?: string;
	/** Small square image as a data URL (resized in the browser, see profile/avatar.ts). */
	avatar?: string;
}

/** The profile fields a child may edit (the rules allow only these). */
export type ProfileLook = Pick<Profile, 'nickname' | 'avatar'>;

/** families/{familyId}/profiles/{profileId}/progress/{conceptId}: the sheet was read. */
export interface ProgressRecord {
	pathId: string;
	readAt: Timestamp;
}

export const NOTE_STATUSES = ['open', 'seen', 'resolved'] as const;
export type NoteStatus = (typeof NOTE_STATUSES)[number];

/** families/{familyId}/profiles/{profileId}/notes/{noteId}: what the child found difficult. */
export interface Note {
	conceptId: string;
	pathId: string;
	/** Set when the note is about an exercise (phase 2). */
	exerciseId: string | null;
	text: string;
	status: NoteStatus;
	/** Null while the write is pending (server timestamp). */
	createdAt: Timestamp | null;
	updatedAt: Timestamp | null;
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
	topics: (PathDoc['topics'][number] & { order: number })[];
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
	prerequisites: ConceptDoc['prerequisites'];
	keyPoints: ConceptDoc['keyPoints'];
	sheet: ConceptDoc['sheet'];
	summaryInstruction?: ConceptDoc['summaryInstruction'];
	archived: boolean;
}

/**
 * families/{familyId}/concepts/{conceptId}/exercises/{exerciseId}
 * Flat: the exercise as in the JSON (id = document id) + `archived`. Read back as an `Exercise`
 * with `{ id, ...record }`, no mapper needed.
 */
export type ExerciseRecord = DistributiveOmit<Exercise, 'id'> & { archived: boolean };

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
