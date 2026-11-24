<script lang="ts">
	import { UI_ICONS } from '#lib/binder/icons.ts';
	import AcquiredToggle from '#lib/components/AcquiredToggle.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import LoadState from '#lib/components/LoadState.svelte';
	import { watchChildProfiles } from '#lib/data/family.ts';
	import { live } from '#lib/data/live.svelte.ts';
	import type { ConceptRecord, WithId } from '#lib/data/types.ts';
	import { fr } from '#lib/i18n/fr.ts';

	/** Parent, on a sheet: the « Acquise » stamp, one toggle per child. */
	let { familyId, sheet }: { familyId: string; sheet: WithId<ConceptRecord> } = $props();

	const t = fr.stamp;
	const childrenLive = live(() => watchChildProfiles(familyId));
</script>

<section class="card card-border bg-base-100">
	<div class="card-body gap-3">
		<h2 class="card-title">
			<Icon paths={UI_ICONS.star} class="size-5 text-primary" />
			{t.title}
		</h2>
		<p class="text-sm text-base-content/70">{t.help}</p>
		<LoadState source={childrenLive} failed={fr.profiles.loadFailed}>
			{#snippet children(kids)}
				<div class="flex flex-wrap gap-2">
					{#each kids as child (child.id)}
						<AcquiredToggle {familyId} {child} {sheet} />
					{:else}
						<p class="text-base-content/70">{t.noChildren}</p>
					{/each}
				</div>
			{/snippet}
		</LoadState>
	</div>
</section>
