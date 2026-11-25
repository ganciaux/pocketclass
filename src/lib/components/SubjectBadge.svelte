<script lang="ts">
	import { SUBJECT_TILE } from '#lib/binder/colors.ts';
	import { ICON_PATHS, subjectIcon } from '#lib/binder/icons.ts';
	import Icon from '#lib/components/Icon.svelte';
	import type { Subject } from '#lib/data/types.ts';

	/**
	 * Picture of a subject: the parent's image if any, else its icon on a tint of its colour.
	 * Decorative (the subject name is always written next to it). `size` in rem.
	 */
	let {
		subject,
		size = 3
	}: { subject: Pick<Subject, 'name' | 'color' | 'icon' | 'image'>; size?: number } = $props();
</script>

{#if subject.image}
	<img
		class="link-lead shrink-0 rounded-box object-cover"
		style:width="{size}rem"
		style:height="{size}rem"
		src={subject.image}
		alt=""
	/>
{:else}
	<span
		class={['link-lead grid shrink-0 place-items-center rounded-box', SUBJECT_TILE[subject.color]]}
		style:width="{size}rem"
		style:height="{size}rem"
		aria-hidden="true"
	>
		<Icon paths={ICON_PATHS[subjectIcon(subject)]} class="size-[55%]" />
	</span>
{/if}
