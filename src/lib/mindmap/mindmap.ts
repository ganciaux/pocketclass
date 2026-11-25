import type { PlayableExercise } from '#lib/practice/answers.ts';
import { generatedDraw, type PracticeSet } from '#lib/practice/generated.ts';
import { buildSeries, shuffle, type Random } from '#lib/practice/series.ts';

/**
 * Mind map of a sheet: its branches, and the « Me tester » draw (practice questions without
 * replacement per child, completed by generated ones). Pure module (unit-tested).
 */

export interface Branch {
	keyPoint: string;
	/** 1-based, as in « L'essentiel ». */
	number: number;
	label: string;
	leaves: string[];
}

interface MapSource {
	keyPoints: { id: string; label: string }[];
	sheet: { sections: { title: string; keyPoints: string[] }[] };
	mindMap?: { keyPoint: string; leaves: string[] }[];
}

/** Most leaves on a branch (the JSON allows 4). */
const MAX_LEAVES = 4;

/** One branch per key point; leaves from the JSON mind map, else the titles of its sections. */
export function mapBranches(sheet: MapSource): Branch[] {
	const written = new Map(sheet.mindMap?.map((b) => [b.keyPoint, b.leaves]));
	return sheet.keyPoints.map((kp, i) => ({
		keyPoint: kp.id,
		number: i + 1,
		label: kp.label,
		leaves:
			written.get(kp.id) ??
			[
				...new Set(
					sheet.sheet.sections.filter((s) => s.keyPoints.includes(kp.id)).map((s) => s.title)
				)
			].slice(0, MAX_LEAVES)
	}));
}

/** Whether a test on `focus` (null: the whole map) has anything to ask. */
export const hasQuestions = (set: PracticeSet, focus: string | null) =>
	[...set.written, ...set.generators].some((e) => focus === null || e.keyPoint === focus);

/** Questions of a test on one branch, and on the whole map. */
export const BRANCH_TEST_SIZE = 3;
export const MAP_TEST_SIZE = 5;

export interface MapTest {
	questions: PlayableExercise[];
	/** Written questions already drawn for this child on this sheet, to store. */
	drawn: string[];
}

/**
 * A test on the branch `focus` (null: the whole map, key points in turn). Written questions are
 * drawn without replacement: one already in `drawn` comes back only once all of the branch (or
 * map) came out, which starts a new round. Generated questions complete a short test.
 */
export function drawMapTest(
	set: PracticeSet,
	drawn: readonly string[],
	focus: string | null,
	random: Random = Math.random
): MapTest {
	const size = focus ? BRANCH_TEST_SIZE : MAP_TEST_SIZE;
	const onBranch = <E extends { keyPoint: string }>(items: E[]) =>
		focus ? items.filter((e) => e.keyPoint === focus) : items;

	const pool = onBranch(set.written);
	const poolIds = new Set(pool.map((e) => e.id));
	const seen = new Set(drawn);
	const picked = buildSeries(
		pool.filter((e) => !seen.has(e.id)),
		size,
		random
	);
	let next = [...drawn, ...picked.map((e) => e.id)];

	// Every question of the pool is out: a new round, which remembers only its own draws.
	if (picked.length < size && picked.length < pool.length) {
		const taken = new Set(picked.map((e) => e.id));
		const more = buildSeries(
			pool.filter((e) => !taken.has(e.id)),
			size - picked.length,
			random
		);
		picked.push(...more);
		next = [...drawn.filter((id) => !poolIds.has(id)), ...more.map((e) => e.id)];
	}

	const questions: PlayableExercise[] = [...picked];
	const generators = shuffle(onBranch(set.generators), random);
	const draw = generatedDraw(random);
	const texts = new Set<string>();
	for (let i = 0; generators.length > 0 && questions.length < size; i++) {
		questions.push(draw(generators[i % generators.length], texts));
	}

	// Only practice questions the sheet still has: the list never grows past them.
	const known = new Set(set.written.map((e) => e.id));
	return { questions: shuffle(questions, random), drawn: next.filter((id) => known.has(id)) };
}
