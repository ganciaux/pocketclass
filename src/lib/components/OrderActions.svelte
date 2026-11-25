<script lang="ts">
	import { UI_ICONS } from '#lib/binder/icons.ts';
	import Icon from '#lib/components/Icon.svelte';
	import { fr } from '#lib/i18n/fr.ts';

	/**
	 * Parent list row actions: move up / down, hide from children or show again, and delete
	 * (only when `ondelete` is given: it opens the confirmation).
	 */
	let {
		first,
		last,
		archived,
		onmove,
		onarchive,
		ondelete
	}: {
		first: boolean;
		last: boolean;
		archived: boolean;
		onmove: (step: -1 | 1) => void;
		onarchive: (archived: boolean) => void;
		ondelete?: () => void;
	} = $props();

	const t = fr.manage;
</script>

<!-- Positioned: stays above the row's stretched link (parent lists). -->
<span class="relative ms-auto flex shrink-0 items-center gap-1">
	<button
		class="btn btn-square btn-ghost btn-xs"
		title={t.moveUp}
		aria-label={t.moveUp}
		disabled={first}
		onclick={() => onmove(-1)}
	>
		↑
	</button>
	<button
		class="btn btn-square btn-ghost btn-xs"
		title={t.moveDown}
		aria-label={t.moveDown}
		disabled={last}
		onclick={() => onmove(1)}
	>
		↓
	</button>
	<!-- Eye closed = hide from children; eye open = show again. -->
	<button
		class="btn btn-square btn-ghost btn-xs"
		title={archived ? t.show : t.hide}
		aria-label={archived ? t.show : t.hide}
		onclick={() => onarchive(!archived)}
	>
		<Icon paths={archived ? UI_ICONS.eye : UI_ICONS.eyeOff} class="size-4" />
	</button>
	{#if ondelete}
		<button class="btn btn-soft btn-error btn-xs" onclick={ondelete}>
			<Icon paths={UI_ICONS.trash} class="size-3.5" />{t.delete}
		</button>
	{/if}
</span>
