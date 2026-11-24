import type { Timestamp } from 'firebase/firestore';
import type { Exercise } from '#lib/schemas/common.ts';
import type { AssessmentDoc, SheetDoc } from '#lib/schemas/sheet.ts';

// Storage shapes. Nested content types are derived from the Zod import schemas, so a schema
// change flows here; only storage-specific fields (order, archived, ids...) are declared.

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
	/** Subjects of other grades shown to this child too (set by the parent). */
	extraSubjects?: string[];
}

/** The profile fields a child may edit (the rules allow only these). */
export type ProfileLook = Pick<Profile, 'nickname' | 'avatar'>;

/**
 * families/{familyId}/profiles/{profileId}/progress/{conceptId}: the child opened the sheet
 * (`openedAt`, updated on every visit) and may have marked it as read. Timestamps are null
 * while the write is pending (server timestamp).
 */
export interface ProgressRecord {
	subjectId: string;
	chapterId: string;
	openedAt: Timestamp | null;
	readAt?: Timestamp | null;
}

export const NOTE_STATUSES = ['open', 'seen', 'resolved'] as const;
export type NoteStatus = (typeof NOTE_STATUSES)[number];

/** families/{familyId}/profiles/{profileId}/notes/{noteId}: what the child found difficult. */
export interface Note {
	conceptId: string;
	chapterId: string;
	/** Set when the note is about an exercise (phase 2). */
	exerciseId: string | null;
	text: string;
	status: NoteStatus;
	/** Null while the write is pending (server timestamp). */
	createdAt: Timestamp | null;
	updatedAt: Timestamp | null;
}

/** Subject colours: Tailwind palette names (500 shades read well in both themes). */
export const SUBJECT_COLORS = [
	'amber',
	'blue',
	'emerald',
	'rose',
	'violet',
	'cyan',
	'orange',
	'lime'
] as const;
export type SubjectColor = (typeof SUBJECT_COLORS)[number];

/** families/{familyId}/subjects/{subjectId}: one subject of one grade (e.g. Maths 3e). */
export interface Subject {
	name: string;
	grade: Grade;
	color: SubjectColor;
	order: number;
	archived: boolean;
}

/** families/{familyId}/chapters/{chapterId}: a folder of sheets inside a subject. */
export interface Chapter {
	subjectId: string;
	title: string;
	/** Heading the chapter is shown under (e.g. "Algèbre"), display only. */
	group: string | null;
	order: number;
	archived: boolean;
}

/** families/{familyId}/concepts/{conceptId}: a sheet (id = JSON id, family-wide). */
export interface ConceptRecord {
	subjectId: string;
	chapterId: string;
	title: string;
	order: number;
	prerequisites: SheetDoc['prerequisites'];
	keyPoints: SheetDoc['keyPoints'];
	sheet: SheetDoc['sheet'];
	summaryInstruction?: SheetDoc['summaryInstruction'];
	/** Increases on every import of the sheet. */
	version: number;
	/** Last import (server timestamp): newer than the child's `openedAt` = "updated". */
	updatedAt: Timestamp | null;
	archived: boolean;
}

/**
 * families/{familyId}/concepts/{conceptId}/exercises/{exerciseId}
 * Flat: the exercise as in the JSON (id = document id) + `archived`. Read back as an `Exercise`
 * with `{ id, ...record }`, no mapper needed.
 */
export type ExerciseRecord = DistributiveOmit<Exercise, 'id'> & { archived: boolean };

/** families/{familyId}/assessments/{assessmentId} (id = concept id) */
export interface AssessmentRecord extends AssessmentDoc {
	chapterId: string;
	conceptIds: string[];
	scoring: { pointsPerCorrect: number; perfectBonus: number };
	archived: boolean;
}

/** A Firestore document with its id. */
export type WithId<T> = T & { id: string };
