<script lang="ts">
	import type { IconPath } from '#lib/binder/icons.ts';

	/**
	 * A line icon from `binder/icons.ts` (`ICON_PATHS[...]` or `UI_ICONS.x`). Decorative: the text
	 * next to it always says the same thing.
	 */
	let { paths, class: className = 'size-5' }: { paths: IconPath[]; class?: string } = $props();
</script>

<svg
	aria-hidden="true"
	class={['shrink-0', className]}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
>
	{#each paths as path, i (i)}
		<path d={path.d} transform={path.transform} />
	{/each}
</svg>
