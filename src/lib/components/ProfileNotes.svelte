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
		mode,
		showResolved = true
	}: {
		familyId: string;
		profileId: string;
		mode: 'child' | 'parent';
		/** False: hide the notes the parent already resolved. */
		showResolved?: boolean;
	} = $props();

	const notesLive = live(() => watchNotes(familyId, profileId));
	const conceptsLive = live(() => watchActiveConcepts(familyId));
	const titles = $derived(new Map((conceptsLive.data ?? []).map((c) => [c.id, c.title])));
</script>

<LoadState source={notesLive} failed={fr.notes.loadFailed}>
	{#snippet children(notes)}
		<NoteList
			{familyId}
			{profileId}
			notes={showResolved ? notes : notes.filter((n) => n.status !== 'resolved')}
			{mode}
			{titles}
		/>
	{/snippet}
</LoadState>
