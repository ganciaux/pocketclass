<script lang="ts">
	import { session } from '#lib/auth.svelte.ts';
	import LoadState from '#lib/components/LoadState.svelte';
	import ProfileDashboard from '#lib/components/ProfileDashboard.svelte';
	import { watchFamilyPaths } from '#lib/data/catalog.ts';
	import { live } from '#lib/data/live.svelte.ts';
	import { watchNotes } from '#lib/data/notes.ts';
	import { openCount } from '#lib/notes/notes.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { displayName } from '#lib/profile/display.ts';
	import { resolve } from '$app/paths';

	// Parents see every path of the family; children see their dashboard (assigned paths).
	const familyPathsLive = live(
		() => session.isAdmin && session.familyId && watchFamilyPaths(session.familyId)
	);
	const notesLive = live(
		() =>
			session.isChild &&
			session.familyId &&
			session.profileId &&
			watchNotes(session.familyId, session.profileId)
	);
</script>

<main class="stack">
	<h1>{fr.auth.hello(session.profile ? displayName(session.profile) : '')}</h1>

	{#if session.isAdmin}
		<section class="card stack">
			<h2>{fr.home.parentSection}</h2>
			<div class="row">
				<a class="button primary" href={resolve('/parent/import')}>{fr.home.importPath}</a>
				<a class="button" href={resolve('/parent/profiles')}>{fr.home.manageProfiles}</a>
			</div>
		</section>

		<section class="stack">
			<h2>{fr.home.familyPaths}</h2>
			<LoadState source={familyPathsLive} failed={fr.home.loadFailed}>
				{#snippet children(list)}
					{#each list as path (path.id)}
						<a class="card card-link stack-tight" href={resolve('/path/[id]', { id: path.id })}>
							<strong>{path.title}</strong>
							<span class="muted">{path.grade} · {fr.home.version(path.version)}</span>
						</a>
					{:else}
						<p class="muted">{fr.home.noFamilyPaths}</p>
					{/each}
				{/snippet}
			</LoadState>
		</section>
	{:else if session.familyId && session.profile}
		<section class="stack">
			<h2>{fr.dashboard.title}</h2>
			<ProfileDashboard familyId={session.familyId} profileId={session.profile.id} />
		</section>
		<a class="card card-link" href={resolve('/me/notes')}>
			{fr.notes.link(openCount(notesLive.data ?? []))}
		</a>
	{/if}
</main>
