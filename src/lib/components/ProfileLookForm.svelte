<script lang="ts">
	import Avatar from '#lib/components/Avatar.svelte';
	import { updateProfileLook } from '#lib/data/family.ts';
	import type { Profile, WithId } from '#lib/data/types.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { AvatarTooLargeError, imageFileToAvatar } from '#lib/profile/avatar.ts';
	import { NICKNAME_MAX } from '#lib/profile/display.ts';
	import { untrack } from 'svelte';

	/** Nickname + avatar of a profile (the child's own, or a child's from the parent page). */
	let { familyId, profile }: { familyId: string; profile: WithId<Profile> } = $props();

	const t = fr.look;

	// Draft initialised from the profile; reset only when another profile is shown.
	let nickname = $state('');
	let avatar = $state<string | null>(null);
	let saved = $state(false);
	let errorMessage = $state<string | null>(null);
	$effect.pre(() => {
		void profile.id;
		untrack(() => {
			nickname = profile.nickname ?? '';
			avatar = profile.avatar ?? null;
			saved = false;
		});
	});

	async function pickImage(event: Event & { currentTarget: HTMLInputElement }) {
		const file = event.currentTarget.files?.[0];
		event.currentTarget.value = '';
		if (!file) return;
		errorMessage = null;
		saved = false;
		try {
			avatar = await imageFileToAvatar(file);
		} catch (error) {
			console.error('[look] image', error);
			errorMessage = error instanceof AvatarTooLargeError ? t.imageTooLarge : t.imageFailed;
		}
	}

	function save(event: SubmitEvent) {
		event.preventDefault();
		// Offline-friendly: applied to the local cache at once, synced later.
		updateProfileLook(familyId, profile.id, { nickname, avatar: avatar ?? undefined });
		saved = true;
	}
</script>

<form class="card stack" onsubmit={save}>
	<h2>{t.title}</h2>
	<div class="row">
		<Avatar profile={{ ...profile, nickname, avatar: avatar ?? undefined }} size={4} />
		<div class="stack-tight">
			<label class="button">
				{t.chooseImage}
				<input class="visually-hidden" type="file" accept="image/*" onchange={pickImage} />
			</label>
			{#if avatar}
				<button type="button" class="link" onclick={() => ((avatar = null), (saved = false))}>
					{t.removeImage}
				</button>
			{/if}
		</div>
	</div>
	<label>
		{t.nickname}
		<input
			bind:value={nickname}
			oninput={() => (saved = false)}
			maxlength={NICKNAME_MAX}
			autocomplete="off"
			placeholder={profile.firstName}
		/>
	</label>
	{#if errorMessage}<p class="error">{errorMessage}</p>{/if}
	{#if saved}<p class="muted" aria-live="polite">{t.saved}</p>{/if}
	<button class="primary" type="submit">{t.save}</button>
</form>

<style>
	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		opacity: 0;
		pointer-events: none;
	}
</style>
