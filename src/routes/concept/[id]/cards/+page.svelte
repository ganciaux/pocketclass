<script lang="ts">
	import { session } from '#lib/auth.svelte.ts';
	import BackLink from '#lib/components/BackLink.svelte';
	import FlashcardDeck from '#lib/components/FlashcardDeck.svelte';
	import LoadState from '#lib/components/LoadState.svelte';
	import { watchConcept } from '#lib/data/catalog.ts';
	import { live } from '#lib/data/live.svelte.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { renderInline } from '#lib/render/markdown.ts';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	/** Revision cards of one sheet. */
	const conceptId = $derived(page.params.id ?? '');
	const conceptLive = live(
		() => session.familyId && conceptId && watchConcept(session.familyId, conceptId)
	);
</script>

<svelte:head>
	{#if conceptLive.data}
		<title>{fr.cards.title} · {conceptLive.data.title} · {fr.app.name}</title>
	{/if}
</svelte:head>

<main>
	<LoadState source={conceptLive} notFound={fr.concept.notFound} failed={fr.concept.loadFailed}>
		{#snippet children(concept)}
			<BackLink href={resolve('/concept/[id]', { id: concept.id })} label={fr.practice.sheet} />
			<header class="flex flex-col gap-1">
				<span class="text-sm font-bold text-base-content/60">{fr.cards.title}</span>
				<h1>{@html renderInline(concept.title)}</h1>
			</header>
			{#if session.familyId}
				<FlashcardDeck familyId={session.familyId} sheets={[concept]} />
			{/if}
		{/snippet}
	</LoadState>
</main>
