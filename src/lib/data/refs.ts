import {
	collection,
	doc,
	type CollectionReference,
	type DocumentData,
	type DocumentReference
} from 'firebase/firestore';
import { db } from '#lib/firebase.ts';
import { COLLECTIONS } from './collections.ts';
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

type Segments = [string, ...string[]];

const FAMILIES = 'families';

/** Any document under families/{familyId} (untyped, used by the import executor). */
export const familyDoc = (familyId: string, ...segments: Segments) =>
	doc(db, FAMILIES, familyId, ...segments) as DocumentReference<DocumentData>;

const familyCol = <T>(familyId: string, ...segments: Segments) =>
	collection(db, FAMILIES, familyId, ...segments) as CollectionReference<T>;
const typedDoc = <T>(familyId: string, ...segments: Segments) =>
	familyDoc(familyId, ...segments) as unknown as DocumentReference<T>;

export const userRef = (uid: string) => doc(db, 'users', uid) as DocumentReference<UserIndex>;
export const familyRef = (familyId: string) =>
	doc(db, FAMILIES, familyId) as DocumentReference<Family>;

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
