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
		() => session.familyId && session.childId && watchNotes(session.familyId, session.childId)
	);
</script>

<main class="doodles">
	<h1>{fr.auth.hello(session.profile ? displayName(session.profile) : '')}</h1>

	{#if session.isAdmin}
		<section class="card bg-neutral text-neutral-content">
			<div class="card-body gap-3">
				<h2 class="card-title">{fr.home.parentSection}</h2>
				<div class="flex flex-wrap gap-2">
					<a class="btn btn-primary" href={resolve('/parent/import')}>{fr.home.importPath}</a>
					<a class="btn btn-outline" href={resolve('/parent/profiles')}>{fr.home.manageProfiles}</a>
				</div>
			</div>
		</section>

		<section class="flex flex-col gap-2">
			<h2>{fr.home.familyPaths}</h2>
			<LoadState source={familyPathsLive} failed={fr.home.loadFailed}>
				{#snippet children(list)}
					{#each list as path (path.id)}
						<a
							class="card card-border bg-base-100 transition-colors hover:border-primary"
							href={resolve('/path/[id]', { id: path.id })}
						>
							<div class="card-body gap-1">
								<strong class="text-lg">{path.title}</strong>
								<span class="flex items-center gap-2 text-sm text-base-content/70">
									<span class="badge badge-sm badge-secondary">{path.grade}</span>
									{fr.home.version(path.version)}
								</span>
							</div>
						</a>
					{:else}
						<p class="text-base-content/70">{fr.home.noFamilyPaths}</p>
					{/each}
				{/snippet}
			</LoadState>
		</section>
	{:else if session.familyId && session.profile}
		<section class="flex flex-col gap-2">
			<h2>{fr.dashboard.title}</h2>
			<ProfileDashboard familyId={session.familyId} profileId={session.profile.id} />
		</section>
		<a
			class="card card-border bg-base-100 transition-colors hover:border-secondary"
			href={resolve('/me/notes')}
		>
			<div class="card-body">{fr.notes.link(openCount(notesLive.data ?? []))}</div>
		</a>
	{/if}
</main>
