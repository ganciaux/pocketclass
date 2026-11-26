import {
	collection,
	doc,
	type CollectionReference,
	type DocumentData,
	type DocumentReference
} from 'firebase/firestore';
import { db } from '#lib/firebase.ts';
import { COLLECTIONS, ROOT } from './collections.ts';
import type {
	AssessmentRecord,
	AttemptRecord,
	Chapter,
	ConceptRecord,
	Device,
	ExerciseRecord,
	MapImageRecord,
	Family,
	LinkCode,
	Note,
	PointsLedgerRecord,
	Profile,
	ProgressRecord,
	Subject,
	UserIndex
} from './types.ts';

// Typed references to Firestore locations. The only place that builds Firestore paths.

const { families: FAMILIES, users: USERS, linkCodes: LINK_CODES } = ROOT;

// The SDK types documents as DocumentData; these helpers state the stored type once.
const typedDoc = <T = DocumentData>(familyId: string, ...segments: string[]) =>
	doc(db, FAMILIES, familyId, ...segments) as DocumentReference<T>;
const familyCol = <T>(familyId: string, ...segments: string[]) =>
	collection(db, FAMILIES, familyId, ...segments) as CollectionReference<T>;

/** Any document under families/{familyId} (untyped, used by the import executor). */
export const familyDoc = (familyId: string, ...segments: string[]) =>
	typedDoc(familyId, ...segments);

export const userRef = (uid: string) => doc(db, USERS, uid) as DocumentReference<UserIndex>;
export const familyRef = (familyId: string) => typedDoc<Family>(familyId);
export const linkCodeRef = (code: string) =>
	doc(db, LINK_CODES, code) as DocumentReference<LinkCode>;

export const devicesCol = (familyId: string) => familyCol<Device>(familyId, COLLECTIONS.devices);
export const deviceRef = (familyId: string, uid: string) =>
	typedDoc<Device>(familyId, COLLECTIONS.devices, uid);

export const profilesCol = (familyId: string) => familyCol<Profile>(familyId, COLLECTIONS.profiles);
export const profileRef = (familyId: string, profileId: string) =>
	typedDoc<Profile>(familyId, COLLECTIONS.profiles, profileId);

export const progressCol = (familyId: string, profileId: string) =>
	familyCol<ProgressRecord>(familyId, COLLECTIONS.profiles, profileId, COLLECTIONS.progress);
export const progressRef = (familyId: string, profileId: string, conceptId: string) =>
	typedDoc<ProgressRecord>(
		familyId,
		COLLECTIONS.profiles,
		profileId,
		COLLECTIONS.progress,
		conceptId
	);

export const notesCol = (familyId: string, profileId: string) =>
	familyCol<Note>(familyId, COLLECTIONS.profiles, profileId, COLLECTIONS.notes);
export const noteRef = (familyId: string, profileId: string, noteId: string) =>
	typedDoc<Note>(familyId, COLLECTIONS.profiles, profileId, COLLECTIONS.notes, noteId);

export const attemptsCol = (familyId: string, profileId: string) =>
	familyCol<AttemptRecord>(familyId, COLLECTIONS.profiles, profileId, COLLECTIONS.attempts);

export const pointsLedgerCol = (familyId: string, profileId: string) =>
	familyCol<PointsLedgerRecord>(
		familyId,
		COLLECTIONS.profiles,
		profileId,
		COLLECTIONS.pointsLedger
	);

export const pointsLedgerRef = (familyId: string, profileId: string, entryId: string) =>
	typedDoc<PointsLedgerRecord>(
		familyId,
		COLLECTIONS.profiles,
		profileId,
		COLLECTIONS.pointsLedger,
		entryId
	);

export const subjectsCol = (familyId: string) => familyCol<Subject>(familyId, COLLECTIONS.subjects);
export const subjectRef = (familyId: string, subjectId: string) =>
	typedDoc<Subject>(familyId, COLLECTIONS.subjects, subjectId);

export const chaptersCol = (familyId: string) => familyCol<Chapter>(familyId, COLLECTIONS.chapters);
export const chapterRef = (familyId: string, chapterId: string) =>
	typedDoc<Chapter>(familyId, COLLECTIONS.chapters, chapterId);

export const conceptsCol = (familyId: string) =>
	familyCol<ConceptRecord>(familyId, COLLECTIONS.concepts);
export const conceptRef = (familyId: string, conceptId: string) =>
	typedDoc<ConceptRecord>(familyId, COLLECTIONS.concepts, conceptId);

export const exercisesCol = (familyId: string, conceptId: string) =>
	familyCol<ExerciseRecord>(familyId, COLLECTIONS.concepts, conceptId, COLLECTIONS.exercises);

export const mapImagesCol = (familyId: string, conceptId: string) =>
	familyCol<MapImageRecord>(familyId, COLLECTIONS.concepts, conceptId, COLLECTIONS.mapImages);
export const mapImageRef = (familyId: string, conceptId: string, imageId: string) =>
	typedDoc<MapImageRecord>(
		familyId,
		COLLECTIONS.concepts,
		conceptId,
		COLLECTIONS.mapImages,
		imageId
	);

export const assessmentsCol = (familyId: string) =>
	familyCol<AssessmentRecord>(familyId, COLLECTIONS.assessments);
export const assessmentRef = (familyId: string, assessmentId: string) =>
	typedDoc<AssessmentRecord>(familyId, COLLECTIONS.assessments, assessmentId);
