<script lang="ts">
	import { session } from '#lib/auth.svelte.ts';
	import Avatar from '#lib/components/Avatar.svelte';
	import ChildDevices from '#lib/components/ChildDevices.svelte';
	import ConfirmDelete from '#lib/components/ConfirmDelete.svelte';
	import ExtraSubjects from '#lib/components/ExtraSubjects.svelte';
	import LoadState from '#lib/components/LoadState.svelte';
	import ProfileLookForm from '#lib/components/ProfileLookForm.svelte';
	import ProfileNotes from '#lib/components/ProfileNotes.svelte';
	import SubjectCards from '#lib/components/SubjectCards.svelte';
	import { deleteChildProfile, watchProfile } from '#lib/data/family.ts';
	import { live } from '#lib/data/live.svelte.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { displayName } from '#lib/profile/display.ts';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	const t = fr.profiles;
	const profileId = $derived(page.params.id ?? '');
	const childLive = live(
		() => session.familyId && profileId && watchProfile(session.familyId, profileId)
	);

	async function deleteChild(familyId: string, childId: string) {
		await deleteChildProfile(familyId, childId);
		await goto(resolve('/parent/profiles'), { replaceState: true });
	}
</script>

<main>
	<a class="link link-hover self-start text-sm" href={resolve('/parent/profiles')}>{t.back}</a>
	{#if session.familyId}
		{@const familyId = session.familyId}
		<LoadState source={childLive} notFound={t.notFound} failed={t.loadFailed}>
			{#snippet children(child)}
				<header class="flex items-center gap-3">
					<Avatar profile={child} size={3.5} />
					<h1 class="flex-1">{displayName(child)}</h1>
					<span class="badge badge-secondary">{child.grade}</span>
				</header>
				<section class="flex flex-col gap-2">
					<h2>{fr.dashboard.title}</h2>
					<SubjectCards {familyId} profile={child} />
				</section>
				<section class="flex flex-col gap-2">
					<h2>{fr.notes.parentTitle}</h2>
					<ProfileNotes {familyId} profileId={child.id} mode="parent" />
				</section>
				<ExtraSubjects {familyId} {child} />
				<ProfileLookForm {familyId} profile={child} />
				<ChildDevices {familyId} profileId={child.id} />
				<ConfirmDelete
					title={t.deleteTitle}
					help={t.deleteHelp(displayName(child))}
					action={t.delete}
					onconfirm={() => deleteChild(familyId, child.id)}
				/>
			{/snippet}
		</LoadState>
	{/if}
</main>
