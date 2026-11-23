<script lang="ts">
	import { session } from '#lib/auth.svelte.ts';
	import { activeConceptsInOrder, conceptsOfPathQuery } from '#lib/data/catalog.ts';
	import { watchDoc, watchQuery } from '#lib/data/live.ts';
	import { pathRef } from '#lib/data/refs.ts';
	import type { ConceptRecord, PathRecord, WithId } from '#lib/data/types.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { renderInline } from '#lib/render/markdown.ts';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	const pathId = $derived(page.params.id ?? '');

	let path = $state<WithId<PathRecord> | null | undefined>(undefined);
	let concepts = $state<WithId<ConceptRecord>[]>([]);
	let failed = $state(false);

	$effect(() => {
		const familyId = session.familyId;
		if (!familyId || !pathId) return;
		path = undefined;
		failed = false;
		const onError = (error: Error) => {
			console.error('[map]', error);
			failed = true;
		};
		const stopPath = watchDoc(pathRef(familyId, pathId), (doc) => (path = doc), onError);
		const stopConcepts = watchQuery(
			conceptsOfPathQuery(familyId, pathId),
			(docs) => (concepts = activeConceptsInOrder(docs)),
			onError
		);
		return () => {
			stopPath();
			stopConcepts();
		};
	});

	const topics = $derived(
		[...(path?.topics ?? [])]
			.sort((a, b) => a.order - b.order)
			.map((topic) => ({ ...topic, concepts: concepts.filter((c) => c.topicId === topic.id) }))
	);
</script>

<svelte:head>
	{#if path}<title>{path.title} · {fr.app.name}</title>{/if}
</svelte:head>

<main class="stack">
	{#if failed}
		<p class="error">{fr.map.loadFailed}</p>
	{:else if path === undefined}
		<p class="muted">{fr.app.loading}</p>
	{:else if path === null}
		<p class="error">{fr.map.notFound}</p>
	{:else}
		<header>
			<h1>{path.title}</h1>
			<p class="muted">{path.grade}</p>
		</header>

		{#each topics as topic (topic.id)}
			<section class="topic">
				<h2>{topic.title}</h2>
				{#if topic.concepts.length === 0}
					<p class="muted empty">{fr.map.emptyTopic}</p>
				{:else}
					<ol class="trail">
						{#each topic.concepts as concept, i (concept.id)}
							<li class="stop" class:right={i % 2 === 1}>
								<a href={resolve('/concept/[id]', { id: concept.id })} class="node">
									<span class="dot" aria-hidden="true"></span>
									<span class="label">
										<strong>{@html renderInline(concept.title)}</strong>
										<span class="status">{fr.map.todo}</span>
									</span>
								</a>
							</li>
						{/each}
					</ol>
				{/if}
			</section>
		{/each}
	{/if}
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
		color: inherit;
		text-decoration: none;
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

	.label {
		display: grid;
		max-width: 10rem;
	}

	.status {
		font-size: 0.8rem;
		color: var(--color-muted);
	}
</style>
