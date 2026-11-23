<script lang="ts">
	import { session } from '#lib/auth.svelte.ts';
	import ChildDevices from '#lib/components/ChildDevices.svelte';
	import LoadState from '#lib/components/LoadState.svelte';
	import { watchProfile } from '#lib/data/family.ts';
	import { live } from '#lib/data/live.svelte.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	const t = fr.profiles;
	const profileId = $derived(page.params.id ?? '');
	const childLive = live(
		() => session.familyId && profileId && watchProfile(session.familyId, profileId)
	);
</script>

<main class="stack">
	<a href={resolve('/parent/profiles')}>{t.back}</a>
	<LoadState source={childLive} notFound={t.notFound} failed={t.loadFailed}>
		{#snippet children(child)}
			<h1>{child.firstName} <span class="muted">{child.grade}</span></h1>
			{#if session.familyId}
				<ChildDevices familyId={session.familyId} profileId={child.id} />
			{/if}
		{/snippet}
	</LoadState>
</main>
