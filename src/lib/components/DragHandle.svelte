<script lang="ts">
	import { UI_ICONS } from '#lib/binder/icons.ts';
	import Icon from '#lib/components/Icon.svelte';
	import { fr } from '#lib/i18n/fr.ts';

	/**
	 * The handle that drags a row of a `sortable` list (mouse or finger). Hidden from screen
	 * readers and the keyboard: the ↑ ↓ buttons of the row do the same.
	 */
</script>

<!-- Positioned: above a row's stretched link. No touch scrolling from here: the finger drags. -->
<span
	data-drag-handle
	class="relative z-10 -my-1 -ms-1 flex shrink-0 cursor-grab touch-none items-center self-stretch rounded-field px-1.5 text-base-content/40 hover:bg-base-200 hover:text-base-content/70 active:cursor-grabbing"
	title={fr.common.drag}
	aria-hidden="true"
>
	<Icon paths={UI_ICONS.grip} class="size-5" />
</span>
