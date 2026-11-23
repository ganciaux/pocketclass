/** Firestore collection names. Pure module (no Firebase import), usable in tests. */

/** Top-level collections. */
export const ROOT = {
	users: 'users',
	families: 'families',
	linkCodes: 'linkCodes'
} as const;

/** Collections under families/{familyId}. */
export const COLLECTIONS = {
	devices: 'devices',
	profiles: 'profiles',
	subjects: 'subjects',
	paths: 'paths',
	concepts: 'concepts',
	exercises: 'exercises',
	assessments: 'assessments',
	assignments: 'assignments',
	progress: 'progress',
	notes: 'notes'
} as const;
