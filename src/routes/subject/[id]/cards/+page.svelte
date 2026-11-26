<script lang="ts">
	import { session } from '#lib/auth.svelte.ts';
	import { sheetsInBinderOrder } from '#lib/binder/binder.ts';
	import BackLink from '#lib/components/BackLink.svelte';
	import FlashcardDeck from '#lib/components/FlashcardDeck.svelte';
	import LoadState from '#lib/components/LoadState.svelte';
	import { watchSubject, watchSubjectContent } from '#lib/data/catalog.ts';
	import { live } from '#lib/data/live.svelte.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	/** Revision cards of a whole binder: every chapter, every sheet, in binder order. */
	const subjectId = $derived(page.params.id ?? '');
	const subjectLive = live(
		() => session.familyId && subjectId && watchSubject(session.familyId, subjectId)
	);
	const contentLive = live(
		() => session.familyId && subjectId && watchSubjectContent(session.familyId, subjectId, null)
	);
</script>

<svelte:head>
	{#if subjectLive.data}
		<title>{fr.cards.title} · {subjectLive.data.name} · {fr.app.name}</title>
	{/if}
</svelte:head>

<main>
	<LoadState source={subjectLive} notFound={fr.binder.subjectNotFound} failed={fr.cards.loadFailed}>
		{#snippet children(subject)}
			<BackLink href={resolve('/subject/[id]', { id: subject.id })} label={subject.name} />
			<header class="flex flex-col gap-1">
				<span class="text-sm font-bold text-base-content/60">{fr.cards.title}</span>
				<h1>{subject.name}</h1>
			</header>
			<LoadState source={contentLive} failed={fr.cards.loadFailed}>
				{#snippet children(content)}
					{#if session.familyId}
						<FlashcardDeck
							familyId={session.familyId}
							sheets={sheetsInBinderOrder(content.sheets, content.chapters)}
						/>
					{/if}
				{/snippet}
			</LoadState>
		{/snippet}
	</LoadState>
</main>
