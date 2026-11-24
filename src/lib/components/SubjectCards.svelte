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
	import TallyLine from '#lib/components/TallyLine.svelte';
	import { watchBinder } from '#lib/data/catalog.ts';
	import { live } from '#lib/data/live.svelte.ts';
	import type { Profile, WithId } from '#lib/data/types.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { resolve } from '$app/paths';

	/**
	 * The binder: one card per subject. With a child `profile`: the subjects they see, with their
	 * progress (child home, parent's view of a child). Without: every subject (parent home).
	 */
	let { familyId, profile }: { familyId: string; profile: WithId<Profile> | null } = $props();

	const t = fr.binder;
	// Primitive: the profile object changes with every edit, its id does not.
	const profileId = $derived(profile?.id ?? null);
	const binderLive = live(() => watchBinder(familyId, profileId));
</script>

<LoadState source={binderLive} failed={t.loadFailed}>
	{#snippet children(binder)}
		{@const subjects = profile
			? visibleSubjects(binder.subjects, profile)
			: sortSubjects(activeOnly(binder.subjects))}
		{@const tallies = tallyBy(
			reachableSheets(binder.sheets, binder.chapters),
			'subjectId',
			progressById(binder.progress)
		)}
		<div class="grid gap-3 sm:grid-cols-2">
			{#each subjects as subject (subject.id)}
				{@const tally = tallies.get(subject.id) ?? { total: 0, read: 0, fresh: 0 }}
				<a
					class={[
						'card border-l-8 bg-base-100 shadow-sm transition-shadow hover:shadow-md',
						SUBJECT_BORDER[subject.color]
					]}
					href={resolve('/subject/[id]', { id: subject.id })}
				>
					<div class="card-body gap-2">
						<span class="flex items-center gap-2">
							<strong class="flex-1 text-lg">{subject.name}</strong>
							{#if subject.grade !== profile?.grade}
								<span class="badge badge-ghost badge-sm">{subject.grade}</span>
							{/if}
						</span>
						{#if profile}
							<TallyLine {tally} />
						{:else}
							<span class="text-sm text-base-content/70">{t.sheets(tally.total)}</span>
						{/if}
					</div>
				</a>
			{:else}
				<p class="text-base-content/70">{profile ? t.noSubjects : t.noSubjectsParent}</p>
			{/each}
		</div>
	{/snippet}
</LoadState>
