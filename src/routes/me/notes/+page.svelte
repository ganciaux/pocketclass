<script lang="ts">
	import { session } from '#lib/auth.svelte.ts';
	import ProfileNotes from '#lib/components/ProfileNotes.svelte';
	import { fr } from '#lib/i18n/fr.ts';
</script>

<svelte:head><title>{fr.notes.title} · {fr.app.name}</title></svelte:head>

<main class="stack">
	<h1>{fr.notes.title}</h1>
	{#if session.familyId && session.profileId}
		<ProfileNotes familyId={session.familyId} profileId={session.profileId} mode="child" />
	{/if}
</main>
