<script lang="ts">
	import {
		activeOnly,
		progressById,
		reachableSheets,
		sortSubjects,
		tallyBy,
		visibleSubjects
	} from '#lib/binder/binder.ts';
	import { SUBJECT_BORDER } from '#lib/binder/colors.ts';
	import { UI_ICONS } from '#lib/binder/icons.ts';
	import Icon from '#lib/components/Icon.svelte';
	import LoadState from '#lib/components/LoadState.svelte';
	import PointsStar from '#lib/components/PointsStar.svelte';
	import { pointsBySubject } from '#lib/practice/assessment.ts';
	import SubjectBadge from '#lib/components/SubjectBadge.svelte';
	import TallyLine from '#lib/components/TallyLine.svelte';
	import { watchBinder } from '#lib/data/catalog.ts';
	import { live } from '#lib/data/live.svelte.ts';
	import { GRADES, type Grade, type Profile, type Subject, type WithId } from '#lib/data/types.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { resolve } from '$app/paths';

	/**
	 * The binder: one card per subject. With a child `view` (grade and extra subjects): the
	 * subjects that child sees, with the progress of `ownerId` (child home, parent testing as a
	 * child, parent's view of a child). Without: every subject, one binder per grade (parent home).
	 */
	let {
		familyId,
		view,
		ownerId
	}: {
		familyId: string;
		view: Pick<Profile, 'grade' | 'extraSubjects'> | null;
		ownerId: string | null;
	} = $props();

	const t = fr.binder;
	const binderLive = live(() => watchBinder(familyId, ownerId));

	type Shelf = { grade: Grade | null; subjects: WithId<Subject>[] };

	/** A child sees one binder; the parent sees one per grade (grades without subjects skipped). */
	function shelves(subjects: WithId<Subject>[]): Shelf[] {
		if (view) return [{ grade: null, subjects: visibleSubjects(subjects, view) }];
		const active = sortSubjects(activeOnly(subjects));
		return GRADES.map((grade) => ({
			grade,
			subjects: active.filter((s) => s.grade === grade)
		})).filter((shelf) => shelf.subjects.length > 0);
	}
</script>

<LoadState source={binderLive} failed={t.loadFailed}>
	{#snippet children(binder)}
		{@const tallies = tallyBy(
			reachableSheets(binder.sheets, binder.chapters),
			'subjectId',
			progressById(binder.progress)
		)}
		{@const points = pointsBySubject(binder.progress)}
		{#each shelves(binder.subjects) as shelf (shelf.grade)}
			{#snippet cards()}
				<div class="grid gap-3 sm:grid-cols-2">
					{#each shelf.subjects as subject (subject.id)}
						{@const tally = tallies.get(subject.id) ?? { total: 0, read: 0, fresh: 0, acquired: 0 }}
						<a
							class={[
								'card card-border link-card binder-card relative border-l-8 bg-base-100 shadow-sm',
								SUBJECT_BORDER[subject.color]
							]}
							href={resolve('/subject/[id]', { id: subject.id })}
						>
							{#if view && points.get(subject.id)}
								<!-- Gold star sticker on the corner: the points of this binder. -->
								<PointsStar
									points={points.get(subject.id) ?? 0}
									class="absolute -top-4 -right-2 z-10 rotate-12"
								/>
							{/if}
							<div class="card-body flex-row items-center gap-4">
								<SubjectBadge {subject} />
								<div class="flex min-w-0 flex-1 flex-col gap-2">
									<strong class="text-lg">{subject.name}</strong>
									{#if view}
										<TallyLine {tally} />
									{:else}
										<span class="text-sm text-base-content/70">{t.sheets(tally.total)}</span>
									{/if}
								</div>
							</div>
						</a>
					{:else}
						<p class="text-base-content/70">{t.noSubjects}</p>
					{/each}
				</div>
			{/snippet}
			{#if shelf.grade}
				<!-- Parent home: one shelf per grade, closed until opened (several grades = a long page). -->
				<details class="group flex flex-col">
					<summary
						class="flex cursor-pointer list-none items-center gap-2 rounded-box py-1 [&::-webkit-details-marker]:hidden"
					>
						<Icon
							paths={UI_ICONS.chevronRight}
							class="size-5 transition-transform duration-200 group-open:rotate-90"
						/>
						<h3 class="text-lg font-bold">{shelf.grade}</h3>
						<span class="badge badge-ghost badge-sm">{t.subjectCount(shelf.subjects.length)}</span>
					</summary>
					<div class="pt-2">{@render cards()}</div>
				</details>
			{:else}
				{@render cards()}
			{/if}
		{:else}
			<p class="text-base-content/70">{t.noSubjectsParent}</p>
		{/each}
	{/snippet}
</LoadState>
