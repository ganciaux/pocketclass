<script lang="ts">
	import BackLink from '#lib/components/BackLink.svelte';
	import { resolve } from '$app/paths';
	import { session } from '#lib/auth.svelte.ts';
	import ProfileNotes from '#lib/components/ProfileNotes.svelte';
	import { fr } from '#lib/i18n/fr.ts';
</script>

<svelte:head><title>{fr.notes.title} · {fr.app.name}</title></svelte:head>

<main>
	<BackLink href={resolve('/')} label={fr.app.home} />
	<h1>{fr.notes.title}</h1>
	{#if session.familyId && session.childView}
		<ProfileNotes familyId={session.familyId} profileId={session.childView.ownerId} mode="child" />
	{/if}
</main>
