<script lang="ts">
	import { session } from '#lib/auth.svelte.ts';
	import LoadState from '#lib/components/LoadState.svelte';
	import { watchConceptsOfPath, watchPath } from '#lib/data/catalog.ts';
	import { live } from '#lib/data/live.svelte.ts';
	import { watchProgress } from '#lib/data/progress.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { topicsOf } from '#lib/progress/paths.ts';
	import { renderInline } from '#lib/render/markdown.ts';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	const pathId = $derived(page.params.id ?? '');
	const pathLive = live(() => session.familyId && pathId && watchPath(session.familyId, pathId));
	const conceptsLive = live(
		() => session.familyId && pathId && watchConceptsOfPath(session.familyId, pathId)
	);
	// Children only: parents do not track their own reading.
	const progressLive = live(
		() => session.familyId && session.childId && watchProgress(session.familyId, session.childId)
	);
	const readIds = $derived(new Set((progressLive.data ?? []).map((p) => p.id)));
</script>

<svelte:head>
	{#if pathLive.data}<title>{pathLive.data.title} · {fr.app.name}</title>{/if}
</svelte:head>

<main>
	<LoadState source={pathLive} notFound={fr.map.notFound} failed={fr.map.loadFailed}>
		{#snippet children(path)}
			<header class="flex items-center justify-between gap-2">
				<h1>{path.title}</h1>
				<span class="badge badge-secondary">{path.grade}</span>
			</header>

			<LoadState source={conceptsLive} failed={fr.map.loadFailed}>
				{#snippet children(concepts)}
					{#each topicsOf(path, concepts) as topic (topic.id)}
						<section class="flex flex-col gap-2">
							<h2>{topic.title}</h2>
							{#if topic.concepts.length === 0}
								<p class="ml-4 text-base-content/70">{fr.common.emptyTopic}</p>
							{:else}
								<ol class="trail">
									{#each topic.concepts as concept, i (concept.id)}
										<li class="stop" class:right={i % 2 === 1} class:read={readIds.has(concept.id)}>
											<a href={resolve('/concept/[id]', { id: concept.id })} class="node">
												<span class="dot" aria-hidden="true"></span>
												<span class="node-text">
													<strong>{@html renderInline(concept.title)}</strong>
													<span class="node-status">
														{readIds.has(concept.id) ? fr.map.read : fr.map.todo}
													</span>
												</span>
											</a>
										</li>
									{/each}
								</ol>
							{/if}
						</section>
					{/each}
				{/snippet}
			</LoadState>
		{/snippet}
	</LoadState>
</main>

<style>
	/* Vertical "mission map": a dashed chalk trail with nodes alternating left and right. */
	.trail {
		position: relative;
		display: grid;
		gap: 1.5rem;
		padding: 0.5rem 0;
	}

	.trail::before {
		content: '';
		position: absolute;
		top: 0;
		bottom: 0;
		left: 50%;
		border-left: 3px dashed var(--color-base-300);
		transform: translateX(-50%);
	}

	.stop {
		position: relative;
		display: flex;
		justify-content: flex-end;
		padding-right: calc(50% - 1.4rem);
	}

	.stop.right {
		justify-content: flex-start;
		padding-right: 0;
		padding-left: calc(50% - 1.4rem);
	}

	.node {
		display: flex;
		flex-direction: row-reverse;
		align-items: center;
		gap: 0.5rem;
		text-align: right;
		color: inherit;
	}

	.right .node {
		flex-direction: row;
		text-align: left;
	}

	.dot {
		flex: none;
		width: 2.8rem;
		height: 2.8rem;
		border-radius: 50%;
		background: var(--color-base-100);
		border: 4px solid var(--color-primary);
		box-shadow: 0 2px 6px rgb(0 0 0 / 0.15);
		transition: transform 0.15s;
	}

	.node:hover .dot,
	.node:focus-visible .dot {
		transform: scale(1.08);
	}

	.read .dot {
		background: var(--color-success);
		border-color: var(--color-success);
	}

	.node-text {
		display: grid;
		max-width: 10rem;
	}

	.node-status {
		font-size: 0.8rem;
		color: color-mix(in oklab, var(--color-base-content) 65%, transparent);
	}

	.read .node-status {
		color: var(--color-success);
	}

	@media (prefers-reduced-motion: reduce) {
		.dot {
			transition: none;
		}
	}
</style>
