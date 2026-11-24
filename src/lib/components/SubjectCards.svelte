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
	import LoadState from '#lib/components/LoadState.svelte';
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
		{#each shelves(binder.subjects) as shelf (shelf.grade)}
			<section class="flex flex-col gap-2">
				{#if shelf.grade}<h3 class="text-lg font-bold">{shelf.grade}</h3>{/if}
				<div class="grid gap-3 sm:grid-cols-2">
					{#each shelf.subjects as subject (subject.id)}
						{@const tally = tallies.get(subject.id) ?? { total: 0, read: 0, fresh: 0, acquired: 0 }}
						<a
							class={[
								'card subject-card border-l-8 bg-base-100 shadow-sm',
								SUBJECT_BORDER[subject.color]
							]}
							href={resolve('/subject/[id]', { id: subject.id })}
						>
							<div class="card-body flex-row items-center gap-4">
								<SubjectBadge {subject} />
								<div class="flex min-w-0 flex-1 flex-col gap-2">
									<span class="flex items-center gap-2">
										<strong class="flex-1 text-lg">{subject.name}</strong>
										{#if view && subject.grade !== view.grade}
											<span class="badge badge-ghost badge-sm">{subject.grade}</span>
										{/if}
									</span>
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
			</section>
		{:else}
			<p class="text-base-content/70">{t.noSubjectsParent}</p>
		{/each}
	{/snippet}
</LoadState>
