import type { Timestamp } from 'firebase/firestore';

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

/** A Firestore document with its id. */
export type WithId<T> = T & { id: string };
