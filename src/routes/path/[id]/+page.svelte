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
		() =>
			session.isChild &&
			session.familyId &&
			session.profileId &&
			watchProgress(session.familyId, session.profileId)
	);
	const readIds = $derived(new Set((progressLive.data ?? []).map((p) => p.id)));
</script>

<svelte:head>
	{#if pathLive.data}<title>{pathLive.data.title} · {fr.app.name}</title>{/if}
</svelte:head>

<main class="stack">
	<LoadState source={pathLive} notFound={fr.map.notFound} failed={fr.map.loadFailed}>
		{#snippet children(path)}
			<header>
				<h1>{path.title}</h1>
				<p class="muted">{path.grade}</p>
			</header>

			<LoadState source={conceptsLive} failed={fr.map.loadFailed}>
				{#snippet children(concepts)}
					{#each topicsOf(path, concepts) as topic (topic.id)}
						<section class="topic">
							<h2>{topic.title}</h2>
							{#if topic.concepts.length === 0}
								<p class="muted empty">{fr.common.emptyTopic}</p>
							{:else}
								<ol class="trail">
									{#each topic.concepts as concept, i (concept.id)}
										<li class="stop" class:right={i % 2 === 1} class:read={readIds.has(concept.id)}>
											<a href={resolve('/concept/[id]', { id: concept.id })} class="node card-link">
												<span class="dot" aria-hidden="true"></span>
												<span class="label">
													<strong>{@html renderInline(concept.title)}</strong>
													<span class="status">
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
	.topic h2 {
		margin-bottom: var(--space-2);
	}

	.empty {
		margin-left: var(--space-3);
	}

	/* Vertical "mission map": a dashed trail with nodes alternating left and right. */
	.trail {
		position: relative;
		margin: 0;
		padding: var(--space-2) 0;
		list-style: none;
		display: grid;
		gap: var(--space-4);
	}

	.trail::before {
		content: '';
		position: absolute;
		top: 0;
		bottom: 0;
		left: 50%;
		border-left: 3px dashed var(--color-border);
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
		gap: var(--space-2);
		text-align: right;
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
		background: var(--color-surface);
		border: 4px solid var(--color-primary);
		box-shadow: var(--shadow);
	}

	.read .dot {
		background: var(--color-success);
		border-color: var(--color-success);
	}

	.read .status {
		color: var(--color-success);
	}

	.label {
		display: grid;
		max-width: 10rem;
	}

	.status {
		font-size: 0.8rem;
		color: var(--color-muted);
	}
</style>
