<script lang="ts">
	import { session } from '#lib/auth.svelte.ts';
	import LoadState from '#lib/components/LoadState.svelte';
	import NoteList from '#lib/components/NoteList.svelte';
	import { watchActiveConcepts } from '#lib/data/catalog.ts';
	import { live } from '#lib/data/live.svelte.ts';
	import { watchNotes } from '#lib/data/notes.ts';
	import { fr } from '#lib/i18n/fr.ts';

	const t = fr.notes;
	const profileId = $derived(session.profileId);
	const notesLive = live(
		() => session.familyId && profileId && watchNotes(session.familyId, profileId)
	);
	const conceptsLive = live(() => session.familyId && watchActiveConcepts(session.familyId));
	const titles = $derived(new Map((conceptsLive.data ?? []).map((c) => [c.id, c.title])));
</script>

<svelte:head><title>{t.title} · {fr.app.name}</title></svelte:head>

<main class="stack">
	<h1>{t.title}</h1>
	<LoadState source={notesLive} failed={t.loadFailed}>
		{#snippet children(notes)}
			{#if session.familyId && profileId}
				<NoteList familyId={session.familyId} {profileId} {notes} mode="child" {titles} />
			{/if}
		{/snippet}
	</LoadState>
</main>
