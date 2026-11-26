<script lang="ts">
	import { session } from '#lib/auth.svelte.ts';
	import ActivityFeed from '#lib/components/ActivityFeed.svelte';
	import BackLink from '#lib/components/BackLink.svelte';
	import { fr } from '#lib/i18n/fr.ts';
	import { resolve } from '$app/paths';

	// The child's activity (or the parent's, testing as a child): runs and points, by day.
	const t = fr.activity;
</script>

<svelte:head><title>{t.title} · {fr.app.name}</title></svelte:head>

<main>
	<BackLink href={resolve('/')} label={fr.app.home} />
	<h1>{t.title}</h1>
	{#if session.familyId && session.ownerId && session.childView}
		<ActivityFeed familyId={session.familyId} profileId={session.ownerId} dayHeading="h2" />
	{/if}
</main>
