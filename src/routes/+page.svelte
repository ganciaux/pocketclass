<script lang="ts">
	import { session } from '#lib/auth.svelte.ts';
	import LoadState from '#lib/components/LoadState.svelte';
	import { watchAssignedPaths, watchFamilyPaths } from '#lib/data/catalog.ts';
	import { live } from '#lib/data/live.svelte.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { resolve } from '$app/paths';

	// Parents see every path of the family; children see the paths assigned to them.
	const paths = live(() => {
		const { familyId, profile } = session;
		if (!familyId || !profile) return null;
		return session.isAdmin ? watchFamilyPaths(familyId) : watchAssignedPaths(familyId, profile.id);
	});
</script>

<main class="stack">
	<h1>{fr.auth.hello(session.profile?.firstName ?? '')}</h1>

	{#if session.isAdmin}
		<section class="card stack">
			<h2>{fr.home.parentSection}</h2>
			<div class="row">
				<a class="button primary" href={resolve('/parent/import')}>{fr.home.importPath}</a>
				<a class="button" href={resolve('/parent/profiles')}>{fr.home.manageProfiles}</a>
			</div>
		</section>
	{/if}

	<section class="stack">
		<h2>{session.isAdmin ? fr.home.familyPaths : fr.home.assignedPaths}</h2>
		<LoadState source={paths} failed={fr.home.loadFailed}>
			{#snippet children(list)}
				{#each list as path (path.id)}
					<a class="card card-link stack-tight" href={resolve('/path/[id]', { id: path.id })}>
						<strong>{path.title}</strong>
						<span class="muted">{path.grade} · {fr.home.version(path.version)}</span>
					</a>
				{:else}
					<p class="muted">{session.isAdmin ? fr.home.noFamilyPaths : fr.home.noAssignedPaths}</p>
				{/each}
			{/snippet}
		</LoadState>
	</section>
</main>
