import { watchBinder } from './catalog.ts';
import { attemptsCol, assessmentsCol, pointsLedgerCol } from './refs.ts';
import { combine, querySource } from './sources.ts';

// Activity history (« Mon activité », parent statistics): the binder (titles, subjects), the
// finished runs, the points lines and the assessments (pass rates). Built by `stats/activity.ts`.

export const watchActivity = (familyId: string, profileId: string) =>
	combine({
		binder: watchBinder(familyId, profileId),
		attempts: querySource(attemptsCol(familyId, profileId)),
		lines: querySource(pointsLedgerCol(familyId, profileId)),
		assessments: querySource(assessmentsCol(familyId))
	});
