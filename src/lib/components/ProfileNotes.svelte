<script lang="ts">
	import LoadState from '#lib/components/LoadState.svelte';
	import NoteList from '#lib/components/NoteList.svelte';
	import { watchActiveConcepts } from '#lib/data/catalog.ts';
	import { live } from '#lib/data/live.svelte.ts';
	import { watchNotes } from '#lib/data/notes.ts';
	import { fr } from '#lib/i18n/fr.ts';

	/** All the notes of a profile, each linking back to its sheet ("My notes", parent view). */
	let {
		familyId,
		profileId,
		mode
	}: { familyId: string; profileId: string; mode: 'child' | 'parent' } = $props();

	const notesLive = live(() => watchNotes(familyId, profileId));
	const conceptsLive = live(() => watchActiveConcepts(familyId));
	const titles = $derived(new Map((conceptsLive.data ?? []).map((c) => [c.id, c.title])));
</script>

<LoadState source={notesLive} failed={fr.notes.loadFailed}>
	{#snippet children(notes)}
		<NoteList {familyId} {profileId} {notes} {mode} {titles} />
	{/snippet}
</LoadState>
