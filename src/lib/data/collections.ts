/** Firestore collection names. Pure module (no Firebase import), usable in tests. */

/** Top-level collections. */
export const ROOT = {
	users: 'users',
	families: 'families'
} as const;

/** Collections under families/{familyId}. */
export const COLLECTIONS = {
	profiles: 'profiles',
	subjects: 'subjects',
	paths: 'paths',
	concepts: 'concepts',
	exercises: 'exercises',
	assessments: 'assessments',
	assignments: 'assignments'
} as const;
