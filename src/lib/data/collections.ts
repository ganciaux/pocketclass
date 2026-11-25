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
	chapters: 'chapters',
	concepts: 'concepts',
	exercises: 'exercises',
	assessments: 'assessments',
	progress: 'progress',
	notes: 'notes',
	attempts: 'attempts'
} as const;
