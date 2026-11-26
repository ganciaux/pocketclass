<script lang="ts">
	import { session } from '#lib/auth.svelte.ts';
	import { activeOnly, byOrder } from '#lib/binder/binder.ts';
	import BackLink from '#lib/components/BackLink.svelte';
	import FlashcardDeck from '#lib/components/FlashcardDeck.svelte';
	import LoadState from '#lib/components/LoadState.svelte';
	import { watchChapter, watchChapterContent } from '#lib/data/catalog.ts';
	import { live } from '#lib/data/live.svelte.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	/** Revision cards of every sheet of a chapter. */
	const chapterId = $derived(page.params.id ?? '');
	const chapterLive = live(
		() => session.familyId && chapterId && watchChapter(session.familyId, chapterId)
	);
	const contentLive = live(
		() => session.familyId && chapterId && watchChapterContent(session.familyId, chapterId, null)
	);
</script>

<svelte:head>
	{#if chapterLive.data}
		<title>{fr.cards.title} · {chapterLive.data.title} · {fr.app.name}</title>
	{/if}
</svelte:head>

<main>
	<LoadState source={chapterLive} notFound={fr.binder.chapterNotFound} failed={fr.cards.loadFailed}>
		{#snippet children(chapter)}
			<BackLink href={resolve('/chapter/[id]', { id: chapter.id })} label={chapter.title} />
			<header class="flex flex-col gap-1">
				<span class="text-sm font-bold text-base-content/60">{fr.cards.title}</span>
				<h1>{chapter.title}</h1>
			</header>
			<LoadState source={contentLive} failed={fr.cards.loadFailed}>
				{#snippet children(content)}
					{#if session.familyId}
						<FlashcardDeck
							familyId={session.familyId}
							sheets={byOrder(activeOnly(content.sheets), (s) => s.title)}
						/>
					{/if}
				{/snippet}
			</LoadState>
		{/snippet}
	</LoadState>
</main>
