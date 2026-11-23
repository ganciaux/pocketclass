<script lang="ts">
	import LoadState from '#lib/components/LoadState.svelte';
	import { watchActiveConcepts, watchAssignedPaths } from '#lib/data/catalog.ts';
	import { live } from '#lib/data/live.svelte.ts';
	import { watchProgress } from '#lib/data/progress.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { renderInline } from '#lib/render/markdown.ts';
	import { pathProgress } from '#lib/progress/paths.ts';
	import { resolve } from '$app/paths';

	/** "Where I am": reading progress of each assigned path. Child home and parent view. */
	let { familyId, profileId }: { familyId: string; profileId: string } = $props();

	const t = fr.dashboard;
	const pathsLive = live(() => watchAssignedPaths(familyId, profileId));
	const conceptsLive = live(() => watchActiveConcepts(familyId));
	const progressLive = live(() => watchProgress(familyId, profileId));
	const readIds = $derived(new Set((progressLive.data ?? []).map((p) => p.id)));
</script>

<LoadState source={pathsLive} failed={t.loadFailed}>
	{#snippet children(paths)}
		<LoadState source={conceptsLive} failed={t.loadFailed}>
			{#snippet children(concepts)}
				{#each pathProgress(paths, concepts, readIds) as progress (progress.pathId)}
					<article class="card card-border bg-base-100">
						<div class="card-body gap-2">
							<a
								class="card-title hover:underline"
								href={resolve('/path/[id]', { id: progress.pathId })}
							>
								{progress.title}
							</a>
							<progress class="progress progress-primary" max={progress.total} value={progress.read}
							></progress>
							<span class="text-sm text-base-content/70">
								{t.read(progress.read, progress.total)}
							</span>
							{#if progress.next}
								<a
									class="btn btn-primary"
									href={resolve('/concept/[id]', { id: progress.next.id })}
								>
									{t.next}
									{@html renderInline(progress.next.title)}
								</a>
							{:else if progress.total > 0}
								<span class="badge badge-success">{t.allRead}</span>
							{/if}
						</div>
					</article>
				{:else}
					<p class="text-base-content/70">{t.empty}</p>
				{/each}
			{/snippet}
		</LoadState>
	{/snippet}
</LoadState>
