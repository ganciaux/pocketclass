<script lang="ts">
	import { session } from '#lib/auth.svelte.ts';
	import ChildDevices from '#lib/components/ChildDevices.svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import LoadState from '#lib/components/LoadState.svelte';
	import NoteList from '#lib/components/NoteList.svelte';
	import ProfileDashboard from '#lib/components/ProfileDashboard.svelte';
	import ProfileLookForm from '#lib/components/ProfileLookForm.svelte';
	import { watchActiveConcepts } from '#lib/data/catalog.ts';
	import { watchProfile } from '#lib/data/family.ts';
	import { watchNotes } from '#lib/data/notes.ts';
	import { live } from '#lib/data/live.svelte.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { displayName } from '#lib/profile/display.ts';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	const t = fr.profiles;
	const profileId = $derived(page.params.id ?? '');
	const childLive = live(
		() => session.familyId && profileId && watchProfile(session.familyId, profileId)
	);
	const notesLive = live(
		() => session.familyId && profileId && watchNotes(session.familyId, profileId)
	);
	const conceptsLive = live(() => session.familyId && watchActiveConcepts(session.familyId));
	const titles = $derived(new Map((conceptsLive.data ?? []).map((c) => [c.id, c.title])));
</script>

<main class="stack">
	<a href={resolve('/parent/profiles')}>{t.back}</a>
	<LoadState source={childLive} notFound={t.notFound} failed={t.loadFailed}>
		{#snippet children(child)}
			<header class="row">
				<Avatar profile={child} size={3} />
				<h1>{displayName(child)} <span class="muted">{child.grade}</span></h1>
			</header>
			{#if session.familyId}
				<section class="stack">
					<h2>{fr.dashboard.title}</h2>
					<ProfileDashboard familyId={session.familyId} profileId={child.id} />
				</section>
				<section class="stack">
					<h2>{fr.notes.parentTitle}</h2>
					<LoadState source={notesLive} failed={fr.notes.loadFailed}>
						{#snippet children(notes)}
							{#if session.familyId}
								<NoteList
									familyId={session.familyId}
									profileId={child.id}
									{notes}
									mode="parent"
									{titles}
								/>
							{/if}
						{/snippet}
					</LoadState>
				</section>
				<ProfileLookForm familyId={session.familyId} profile={child} />
				<ChildDevices familyId={session.familyId} profileId={child.id} />
			{/if}
		{/snippet}
	</LoadState>
</main>
