<script lang="ts">
	import { activeOnly } from '#lib/binder/binder.ts';
	import LoadState from '#lib/components/LoadState.svelte';
	import { watchSubjects } from '#lib/data/catalog.ts';
	import { setExtraSubjects } from '#lib/data/family.ts';
	import { live } from '#lib/data/live.svelte.ts';
	import type { Profile, WithId } from '#lib/data/types.ts';
	import { fr } from '#lib/i18n/fr.ts';

	/** Parent: subjects of other grades a child sees too (e.g. Maths 6e to revise basics). */
	let { familyId, child }: { familyId: string; child: WithId<Profile> } = $props();

	const t = fr.profiles;
	const subjectsLive = live(() => watchSubjects(familyId));
	const extras = $derived(new Set(child.extraSubjects ?? []));

	function toggle(subjectId: string, checked: boolean) {
		const next = new Set(extras);
		if (checked) next.add(subjectId);
		else next.delete(subjectId);
		setExtraSubjects(familyId, child.id, [...next]);
	}
</script>

<section class="card card-border bg-base-100">
	<div class="card-body gap-3">
		<h2 class="card-title">{t.extraSubjects}</h2>
		<LoadState source={subjectsLive} failed={fr.binder.loadFailed}>
			{#snippet children(subjects)}
				{@const others = activeOnly(subjects).filter((s) => s.grade !== child.grade)}
				{#if others.length > 0}
					<p class="text-sm text-base-content/70">{t.extraHelp(child.grade ?? '')}</p>
					{#each others as subject (subject.id)}
						<label class="flex cursor-pointer items-center gap-3">
							<input
								class="checkbox checkbox-primary"
								type="checkbox"
								checked={extras.has(subject.id)}
								onchange={(e) => toggle(subject.id, e.currentTarget.checked)}
							/>
							<span>{subject.name}</span>
							<span class="badge badge-ghost badge-sm">{subject.grade}</span>
						</label>
					{/each}
				{:else}
					<p class="text-base-content/70">{t.noOtherSubjects}</p>
				{/if}
			{/snippet}
		</LoadState>
	</div>
</section>
