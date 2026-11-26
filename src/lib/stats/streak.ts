/**
 * Days in a row with at least one finished run (series, challenge, assessment, review), for the
 * child's « Aujourd'hui » card. Calendar days in local time. Pure module (unit-tested).
 */

const dayKey = (ms: number) => {
	const date = new Date(ms);
	return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

const previousDay = (ms: number) => {
	const date = new Date(ms);
	date.setDate(date.getDate() - 1);
	return date.getTime();
};

/**
 * `days`: the current streak, ending today or yesterday (still alive until tonight); `today`:
 * whether today already counts. `times` in ms (a pending run: now).
 */
export function streak(times: number[], now: number): { days: number; today: boolean } {
	const active = new Set(times.map(dayKey));
	const today = active.has(dayKey(now));
	let day = today ? now : previousDay(now);
	let days = 0;
	while (active.has(dayKey(day))) {
		days++;
		day = previousDay(day);
	}
	return { days, today };
}
