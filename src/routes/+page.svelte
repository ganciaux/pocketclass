<script lang="ts">
	import { session } from '#lib/auth.svelte.ts';
	import SubjectCards from '#lib/components/SubjectCards.svelte';
	import { live } from '#lib/data/live.svelte.ts';
	import { watchNotes } from '#lib/data/notes.ts';
	import { openCount } from '#lib/notes/notes.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { displayName } from '#lib/profile/display.ts';
	import { resolve } from '$app/paths';

	// Parents see every subject of the family; children see their binder with their progress.
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
					<a class="btn btn-primary" href={resolve('/parent/subjects')}>{fr.home.manageBinder}</a>
					<a class="btn btn-outline" href={resolve('/parent/profiles')}>{fr.home.manageProfiles}</a>
					<a class="btn btn-outline" href={resolve('/parent/notes')}>{fr.home.childrenNotes}</a>
				</div>
			</div>
		</section>
	{/if}

	{#if session.familyId && session.profile}
		<section class="flex flex-col gap-2">
			<h2>{session.isAdmin ? fr.home.familyBinder : fr.home.myBinder}</h2>
			<SubjectCards
				familyId={session.familyId}
				profile={session.isChild ? session.profile : null}
			/>
		</section>
	{/if}

	{#if session.isChild}
		<a
			class="card card-border bg-base-100 transition-colors hover:border-secondary"
			href={resolve('/me/notes')}
		>
			<div class="card-body">{fr.notes.link(openCount(notesLive.data ?? []))}</div>
		</a>
	{/if}
</main>
