/** Collection names under families/{familyId}. Pure module (no Firebase import), usable in tests. */
export const COLLECTIONS = {
	profiles: 'profiles',
	subjects: 'subjects',
	paths: 'paths',
	concepts: 'concepts',
	exercises: 'exercises',
	assessments: 'assessments',
	assignments: 'assignments'
} as const;
