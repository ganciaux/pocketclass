<script lang="ts">
	import { session } from '#lib/auth.svelte.ts';
	import { STATUS_CHIP } from '#lib/binder/colors.ts';
	import Avatar from '#lib/components/Avatar.svelte';
	import BackLink from '#lib/components/BackLink.svelte';
	import ChildStats from '#lib/components/ChildStats.svelte';
	import LoadState from '#lib/components/LoadState.svelte';
	import { watchChildProfiles } from '#lib/data/family.ts';
	import { live } from '#lib/data/live.svelte.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { displayName } from '#lib/profile/display.ts';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	const t = fr.stats;
	const childrenLive = live(() => session.familyId && watchChildProfiles(session.familyId));
	// `?child=<profile id>` (the first child by default) and `?subject=<id>` (detailed view).
	const chosen = $derived(page.url.searchParams.get('child'));
	const subjectId = $derived(page.url.searchParams.get('subject'));
	const hrefOf = (profileId: string) =>
		`${resolve('/parent/stats')}?child=${encodeURIComponent(profileId)}`;
</script>

<svelte:head><title>{t.title} · {fr.app.name}</title></svelte:head>

<main>
	<!-- From a binder's detail, back to the overview of the same child; else to the home page. -->
	{#if subjectId}
		<BackLink
			href="{resolve('/parent/stats')}{chosen ? `?child=${encodeURIComponent(chosen)}` : ''}"
			label={t.overview}
		/>
	{:else}
		<BackLink href={resolve('/')} label={fr.app.home} />
	{/if}
	<h1>{t.title}</h1>
	{#if session.familyId && session.profileId}
		{@const familyId = session.familyId}
		{@const ownId = session.profileId}
		<LoadState source={childrenLive} failed={fr.profiles.loadFailed}>
			{#snippet children(list)}
				{@const who = chosen ?? list[0]?.id ?? ownId}
				{@const child = list.find((c) => c.id === who)}
				<nav class="flex flex-wrap gap-2" aria-label={t.who}>
					{#each list as item (item.id)}
						<a
							class={[
								'btn btn-sm rounded-full ps-1',
								item.id === who ? STATUS_CHIP.all.on : STATUS_CHIP.all.off
							]}
							href={hrefOf(item.id)}
							aria-current={item.id === who ? 'page' : undefined}
						>
							<Avatar profile={item} size={1.5} />
							{displayName(item)}
						</a>
					{/each}
					<!-- The parent's own data from the child test mode (to check it). -->
					<a
						class={[
							'btn btn-sm rounded-full',
							who === ownId ? STATUS_CHIP.all.on : STATUS_CHIP.all.off
						]}
						href={hrefOf(ownId)}
						aria-current={who === ownId ? 'page' : undefined}
					>
						{t.myTests}
					</a>
				</nav>
				{#if list.length === 0}
					<p class="text-base-content/70">{t.noChildren}</p>
				{/if}
				{#if child || who === ownId}
					<ChildStats
						{familyId}
						profileId={who}
						view={child ?? null}
						points={(child ?? session.profile)?.points ?? 0}
						{subjectId}
					/>
				{/if}
			{/snippet}
		</LoadState>
	{/if}
</main>
