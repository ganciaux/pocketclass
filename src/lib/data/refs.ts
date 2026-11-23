import {
	collection,
	doc,
	type CollectionReference,
	type DocumentReference
} from 'firebase/firestore';
import { db } from '#lib/firebase.ts';
import type { Family, Profile, UserIndex } from './types.ts';

// Typed references to Firestore locations. One place for every collection name.

export const userRef = (uid: string) => doc(db, 'users', uid) as DocumentReference<UserIndex>;

export const familiesCol = () => collection(db, 'families') as CollectionReference<Family>;

export const familyRef = (familyId: string) =>
	doc(db, 'families', familyId) as DocumentReference<Family>;

export const profilesCol = (familyId: string) =>
	collection(db, 'families', familyId, 'profiles') as CollectionReference<Profile>;

export const profileRef = (familyId: string, profileId: string) =>
	doc(db, 'families', familyId, 'profiles', profileId) as DocumentReference<Profile>;
