<script lang="ts">
	import { seesSubject } from '#lib/binder/binder.ts';
	import { UI_ICONS } from '#lib/binder/icons.ts';
	import AcquiredToggle from '#lib/components/AcquiredToggle.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import LoadState from '#lib/components/LoadState.svelte';
	import { watchSubject } from '#lib/data/catalog.ts';
	import { watchChildProfiles } from '#lib/data/family.ts';
	import { live } from '#lib/data/live.svelte.ts';
	import { combine } from '#lib/data/sources.ts';
	import type { ConceptRecord, WithId } from '#lib/data/types.ts';
	import { fr } from '#lib/i18n/fr.ts';

	/**
	 * Parent, on a sheet: the « Acquise » stamp, one toggle per child who sees the sheet (its
	 * subject is of their grade, or was added to their binder).
	 */
	let { familyId, sheet }: { familyId: string; sheet: WithId<ConceptRecord> } = $props();

	const t = fr.stamp;
	const subjectId = $derived(sheet.subjectId);
	const childrenLive = live(() =>
		combine({
			kids: watchChildProfiles(familyId),
			subject: watchSubject(familyId, subjectId, true)
		})
	);
</script>

<section class="card card-border bg-base-100">
	<div class="card-body gap-3">
		<h2 class="card-title">
			<Icon paths={UI_ICONS.star} class="size-5 text-primary" />
			{t.title}
		</h2>
		<p class="text-sm text-base-content/70">{t.help}</p>
		<LoadState source={childrenLive} failed={fr.profiles.loadFailed}>
			{#snippet children({ kids, subject })}
				{@const readers = subject ? kids.filter((child) => seesSubject(child, subject)) : []}
				<div class="flex flex-wrap gap-2">
					{#each readers as child (child.id)}
						<AcquiredToggle {familyId} {child} {sheet} />
					{:else}
						<p class="text-base-content/70">{t.noChildren}</p>
					{/each}
				</div>
			{/snippet}
		</LoadState>
	</div>
</section>
