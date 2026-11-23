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
					<article class="card stack-tight">
						<a href={resolve('/path/[id]', { id: progress.pathId })}>
							<strong>{progress.title}</strong>
						</a>
						<progress max={progress.total} value={progress.read}></progress>
						<span class="muted small">{t.read(progress.read, progress.total)}</span>
						{#if progress.next}
							<a class="button primary" href={resolve('/concept/[id]', { id: progress.next.id })}>
								{t.next}
								{@html renderInline(progress.next.title)}
							</a>
						{:else if progress.total > 0}
							<span class="pill success">{t.allRead}</span>
						{/if}
					</article>
				{:else}
					<p class="muted">{t.empty}</p>
				{/each}
			{/snippet}
		</LoadState>
	{/snippet}
</LoadState>

<style>
	progress {
		width: 100%;
		height: 0.6rem;
		accent-color: var(--color-primary);
	}
</style>
