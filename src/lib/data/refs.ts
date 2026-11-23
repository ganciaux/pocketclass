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
	Assignment,
	ConceptRecord,
	ExerciseRecord,
	Family,
	PathRecord,
	Profile,
	Subject,
	UserIndex
} from './types.ts';

// Typed references to Firestore locations. The only place that builds Firestore paths.

const { families: FAMILIES, users: USERS } = ROOT;

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

export const profilesCol = (familyId: string) => familyCol<Profile>(familyId, COLLECTIONS.profiles);
export const profileRef = (familyId: string, profileId: string) =>
	typedDoc<Profile>(familyId, COLLECTIONS.profiles, profileId);

export const assignmentsCol = (familyId: string, profileId: string) =>
	familyCol<Assignment>(familyId, COLLECTIONS.profiles, profileId, COLLECTIONS.assignments);
export const assignmentRef = (familyId: string, profileId: string, pathId: string) =>
	typedDoc<Assignment>(familyId, COLLECTIONS.profiles, profileId, COLLECTIONS.assignments, pathId);

export const subjectRef = (familyId: string, subjectId: string) =>
	typedDoc<Subject>(familyId, COLLECTIONS.subjects, subjectId);

export const pathsCol = (familyId: string) => familyCol<PathRecord>(familyId, COLLECTIONS.paths);
export const pathRef = (familyId: string, pathId: string) =>
	typedDoc<PathRecord>(familyId, COLLECTIONS.paths, pathId);

export const conceptsCol = (familyId: string) =>
	familyCol<ConceptRecord>(familyId, COLLECTIONS.concepts);
export const conceptRef = (familyId: string, conceptId: string) =>
	typedDoc<ConceptRecord>(familyId, COLLECTIONS.concepts, conceptId);

export const exercisesCol = (familyId: string, conceptId: string) =>
	familyCol<ExerciseRecord>(familyId, COLLECTIONS.concepts, conceptId, COLLECTIONS.exercises);

export const assessmentsCol = (familyId: string) =>
	familyCol<AssessmentRecord>(familyId, COLLECTIONS.assessments);
