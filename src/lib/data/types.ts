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
	/** The points line counted last (`pointsLedger` id), checked by the rules. */
	lastEarningId?: string;
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
 * while the write is pending (server timestamp). `acquiredAt` is the parent's « Acquise » stamp;
 * a stamp on a sheet never opened creates the document without `openedAt`.
 */
export interface ProgressRecord {
	subjectId: string;
	chapterId: string;
	openedAt?: Timestamp | null;
	readAt?: Timestamp | null;
	acquiredAt?: Timestamp | null;
	/** Practice (phase 2): last and best series score, time of the last series. */
	practiceLast?: PracticeScore;
	practiceBest?: PracticeScore;
	practicedAt?: Timestamp | null;
	/** Timed challenge: record (right answers in 60 s) and time of the last challenge. */
	challengeBest?: number;
	challengedAt?: Timestamp | null;
	/** Assessment (phase 3): last and best score, time of the last one. */
	assessmentLast?: PracticeScore;
	assessmentBest?: PracticeScore;
	assessedAt?: Timestamp | null;
	/** The « Raté » stamp (failed, not acquired since). */
	failedAt?: Timestamp | null;
	/** After a fail: a new try waits for a finished practice series. */
	retakeLocked?: boolean;
	/** Points earned by this sheet's assessment (set once, at the first pass). */
	assessmentPoints?: number;
}

export interface PracticeScore {
	correct: number;
	total: number;
}

export const ATTEMPT_MODES = ['series', 'timed', 'assessment'] as const;
export type AttemptMode = (typeof ATTEMPT_MODES)[number];

/**
 * families/{familyId}/profiles/{profileId}/attempts/{attemptId}: one practice series (created
 * once, never changed). Kept as a history; the scores shown come from the progress document.
 */
export interface AttemptRecord extends PracticeScore {
	conceptId: string;
	subjectId: string;
	chapterId: string;
	mode: AttemptMode;
	answers: { exerciseId: string; correct: boolean }[];
	/** Null while the write is pending (server timestamp). */
	createdAt: Timestamp | null;
}

export const NOTE_STATUSES = ['open', 'seen', 'resolved'] as const;
export type NoteStatus = (typeof NOTE_STATUSES)[number];

/**
 * families/{familyId}/profiles/{profileId}/notes/{noteId}: what the child found difficult, about
 * a sheet (`conceptId` + `chapterId` + `subjectId`), a chapter (`chapterId`), a subject
 * (`subjectId`) or nothing (free note: every id null). Older notes have no `subjectId`.
 */
export interface Note {
	conceptId: string | null;
	chapterId: string | null;
	subjectId?: string | null;
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

/** Subject icons (drawn in `binder/icons.ts`). */
export const SUBJECT_ICONS = [
	'calculator',
	'pi',
	'book',
	'languages',
	'landmark',
	'globe',
	'flask',
	'atom',
	'leaf',
	'laptop',
	'music',
	'palette',
	'dumbbell',
	'star'
] as const;
export type SubjectIcon = (typeof SUBJECT_ICONS)[number];

/** families/{familyId}/subjects/{subjectId}: one subject of one grade (e.g. Maths 3e). */
export interface Subject {
	name: string;
	grade: Grade;
	color: SubjectColor;
	order: number;
	archived: boolean;
	/** Chosen icon; absent: suggested from the name (`subjectIcon()`). */
	icon?: SubjectIcon;
	/** Picture or logo chosen by the parent (small data URL, like a profile avatar); wins over the icon. */
	image?: string;
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
	/** Keywords for the search; absent on sheets imported before tags existed. */
	tags?: SheetDoc['tags'];
	/** Absent when the JSON had none (the app then builds the map from the sections). */
	mindMap?: SheetDoc['mindMap'];
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
export interface AssessmentRecord extends AssessmentDoc, AssessmentSettingsRecord {
	chapterId: string;
	conceptIds: string[];
	archived: boolean;
}

/** Set by the parent only (absent: defaults of `practice/assessment.ts` `settingsOf`). */
export interface AssessmentSettingsRecord {
	/** Minimum success rate, in %. */
	passRate?: number;
	/** Points earned by the first pass. */
	points?: number;
}

/**
 * families/{familyId}/profiles/{profileId}/pointsLedger/{entryId}
 * One line per earning; id `assessment-<conceptId>` (once per sheet). Create only.
 */
export interface PointsLedgerRecord {
	kind: 'assessment';
	conceptId: string;
	subjectId: string;
	chapterId: string;
	amount: number;
	createdAt: Timestamp | null;
}

/** A Firestore document with its id. */
export type WithId<T> = T & { id: string };
