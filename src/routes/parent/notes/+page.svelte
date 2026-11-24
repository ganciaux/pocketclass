<script lang="ts">
	import { session } from '#lib/auth.svelte.ts';
	import Avatar from '#lib/components/Avatar.svelte';
	import LoadState from '#lib/components/LoadState.svelte';
	import ProfileNotes from '#lib/components/ProfileNotes.svelte';
	import { watchChildProfiles } from '#lib/data/family.ts';
	import { live } from '#lib/data/live.svelte.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { displayName } from '#lib/profile/display.ts';
	import { resolve } from '$app/paths';

	/** Every child's notes on one page, so the parent sees at once what to explain again. */
	const t = fr.notes;
	const childProfilesLive = live(() => session.familyId && watchChildProfiles(session.familyId));
	let showResolved = $state(false);
</script>

<svelte:head><title>{t.familyTitle} · {fr.app.name}</title></svelte:head>

<main>
	<h1>{t.familyTitle}</h1>
	<label class="flex cursor-pointer items-center gap-3">
		<input class="toggle toggle-primary toggle-sm" type="checkbox" bind:checked={showResolved} />
		<span>{t.showResolved}</span>
	</label>

	{#if session.familyId}
		{@const familyId = session.familyId}
		<LoadState source={childProfilesLive} failed={fr.profiles.loadFailed}>
			{#snippet children(childProfiles)}
				{#each childProfiles as child (child.id)}
					<section class="flex flex-col gap-2">
						<a
							class="flex items-center gap-3 hover:underline"
							href={resolve('/parent/profiles/[id]', { id: child.id })}
						>
							<Avatar profile={child} size={2.5} />
							<h2>{displayName(child)}</h2>
						</a>
						<ProfileNotes {familyId} profileId={child.id} mode="parent" {showResolved} />
					</section>
				{:else}
					<p class="text-base-content/70">{t.noChildren}</p>
				{/each}
			{/snippet}
		</LoadState>
	{/if}
</main>
