import {
	collection,
	doc,
	type CollectionReference,
	type DocumentReference
} from 'firebase/firestore';
import { db } from '#lib/firebase.ts';
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

import { COLLECTIONS } from './collections.ts';

// Typed references to Firestore locations.

const col = <T>(...segments: [string, ...string[]]) =>
	collection(db, ...segments) as CollectionReference<T>;
const ref = <T>(...segments: [string, ...string[]]) => doc(db, ...segments) as DocumentReference<T>;

export const userRef = (uid: string) => ref<UserIndex>('users', uid);

export const familiesCol = () => col<Family>('families');
export const familyRef = (familyId: string) => ref<Family>('families', familyId);

export const profilesCol = (familyId: string) =>
	col<Profile>('families', familyId, COLLECTIONS.profiles);
export const profileRef = (familyId: string, profileId: string) =>
	ref<Profile>('families', familyId, COLLECTIONS.profiles, profileId);

export const assignmentsCol = (familyId: string, profileId: string) =>
	col<Assignment>('families', familyId, COLLECTIONS.profiles, profileId, COLLECTIONS.assignments);
export const assignmentRef = (familyId: string, profileId: string, pathId: string) =>
	ref<Assignment>(
		'families',
		familyId,
		COLLECTIONS.profiles,
		profileId,
		COLLECTIONS.assignments,
		pathId
	);

export const subjectRef = (familyId: string, subjectId: string) =>
	ref<Subject>('families', familyId, COLLECTIONS.subjects, subjectId);

export const pathsCol = (familyId: string) =>
	col<PathRecord>('families', familyId, COLLECTIONS.paths);
export const pathRef = (familyId: string, pathId: string) =>
	ref<PathRecord>('families', familyId, COLLECTIONS.paths, pathId);

export const conceptsCol = (familyId: string) =>
	col<ConceptRecord>('families', familyId, COLLECTIONS.concepts);
export const conceptRef = (familyId: string, conceptId: string) =>
	ref<ConceptRecord>('families', familyId, COLLECTIONS.concepts, conceptId);

export const exercisesCol = (familyId: string, conceptId: string) =>
	col<ExerciseRecord>('families', familyId, COLLECTIONS.concepts, conceptId, COLLECTIONS.exercises);

export const assessmentsCol = (familyId: string) =>
	col<AssessmentRecord>('families', familyId, COLLECTIONS.assessments);
