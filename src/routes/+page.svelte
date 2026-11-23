<script lang="ts">
	import { session } from '#lib/auth.svelte.ts';
	import { allPathsQuery } from '#lib/data/catalog.ts';
	import { firstSnapshot, watchQuery } from '#lib/data/live.ts';
	import { assignmentsCol, pathRef } from '#lib/data/refs.ts';
	import type { PathRecord, WithId } from '#lib/data/types.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { resolve } from '$app/paths';

	let paths = $state<WithId<PathRecord>[] | null>(null);

	// Parents see every path of the family; children see the paths assigned to them.
	$effect(() => {
		const familyId = session.familyId;
		const profile = session.profile;
		if (!familyId || !profile) return;
		const onError = (error: Error) => console.error('[home] paths', error);

		if (profile.role === 'admin') {
			return watchQuery(allPathsQuery(familyId), (docs) => (paths = docs), onError);
		}
		return watchQuery(
			assignmentsCol(familyId, profile.id),
			async (assignments) => {
				const snaps = await Promise.all(
					assignments.map((a) => firstSnapshot(pathRef(familyId, a.id)))
				);
				paths = snaps.filter((s) => s.exists()).map((s) => ({ id: s.id, ...s.data()! }));
			},
			onError
		);
	});

	const sortedPaths = $derived([...(paths ?? [])].sort((a, b) => a.title.localeCompare(b.title)));
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
		{#if paths === null}
			<p class="muted">{fr.app.loading}</p>
		{:else if sortedPaths.length === 0}
			<p class="muted">{session.isAdmin ? fr.home.noFamilyPaths : fr.home.noAssignedPaths}</p>
		{:else}
			{#each sortedPaths as path (path.id)}
				<a class="card path-card" href={resolve('/path/[id]', { id: path.id })}>
					<strong>{path.title}</strong>
					<span class="muted">{path.grade} · {fr.home.version(path.version)}</span>
				</a>
			{/each}
		{/if}
	</section>
</main>

<style>
	.path-card {
		display: grid;
		gap: var(--space-1);
		color: inherit;
		text-decoration: none;
	}
</style>
