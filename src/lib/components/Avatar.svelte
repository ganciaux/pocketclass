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

<!-- Size in rem through a CSS variable: any size without one class per size. -->
<span
	class="link-lead inline-grid flex-none place-items-center overflow-hidden rounded-full bg-primary font-bold text-primary-content ring-2 ring-primary/40"
	style:width="{size}rem"
	style:height="{size}rem"
	style:font-size="{size * 0.45}rem"
	aria-hidden="true"
>
	{#if profile.avatar}
		<img src={profile.avatar} alt="" class="size-full object-cover" />
	{:else}
		{initialOf(name)}
	{/if}
</span>
