<script lang="ts">
	import LoadState from '#lib/components/LoadState.svelte';
	import NoteList from '#lib/components/NoteList.svelte';
	import { activeOnly } from '#lib/binder/binder.ts';
	import { watchActiveConcepts, watchChapters, watchSubjects } from '#lib/data/catalog.ts';
	import { live } from '#lib/data/live.svelte.ts';
	import { watchNotes } from '#lib/data/notes.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import type { NoteCatalog } from '#lib/notes/notes.ts';

	/** All the notes of a profile, each linking back to where it was written ("My notes", parent view). */
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
	const chaptersLive = live(() => watchChapters(familyId));
	const subjectsLive = live(() => watchSubjects(familyId));
	/** Titles of what the notes can be about; hidden chapters and subjects count as gone. */
	const catalog = $derived<NoteCatalog>({
		sheets: new Map((conceptsLive.data ?? []).map((c) => [c.id, c.title])),
		chapters: new Map(activeOnly(chaptersLive.data ?? []).map((c) => [c.id, c.title])),
		subjects: new Map(activeOnly(subjectsLive.data ?? []).map((s) => [s.id, s.name]))
	});
</script>

<LoadState source={notesLive} failed={fr.notes.loadFailed}>
	{#snippet children(notes)}
		<NoteList
			{familyId}
			{profileId}
			notes={showResolved ? notes : notes.filter((n) => n.status !== 'resolved')}
			{mode}
			{catalog}
		/>
	{/snippet}
</LoadState>
