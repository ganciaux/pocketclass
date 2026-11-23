<script lang="ts">
	import type { Profile } from '#lib/data/types.ts';
	import { displayName, initialOf } from '#lib/profile/display.ts';

	/** Profile picture, or the initial of the displayed name. */
	let {
		profile,
		size = 2.5
	}: { profile: Pick<Profile, 'firstName' | 'nickname' | 'avatar'>; size?: number } = $props();

	const name = $derived(displayName(profile));
</script>

<span class="avatar" style:--size="{size}rem" aria-hidden="true">
	{#if profile.avatar}
		<img src={profile.avatar} alt="" />
	{:else}
		{initialOf(name)}
	{/if}
</span>

<style>
	.avatar {
		flex: none;
		display: inline-grid;
		place-items: center;
		width: var(--size);
		height: var(--size);
		border-radius: 50%;
		overflow: hidden;
		background: var(--color-primary);
		color: var(--color-primary-contrast);
		font-weight: 700;
		font-size: calc(var(--size) * 0.45);
	}

	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
</style>
