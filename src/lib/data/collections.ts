/** Firestore collection names. Pure module (no Firebase import), usable in tests. */

/** Top-level collections. */
export const ROOT = {
	users: 'users',
	families: 'families',
	linkCodes: 'linkCodes',
	/** Co-parent invitations, by e-mail (top level: the invited parent has no family here yet). */
	invites: 'invites'
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
	attempts: 'attempts',
	pointsLedger: 'pointsLedger',
	/** Under a concept: pictures added to its mind map by the parent. */
	mapImages: 'mapImages',
	/** Under a concept: pictures added to its sections by the parent. */
	sectionImages: 'sectionImages'
} as const;
