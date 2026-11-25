<script lang="ts">
	import type { Tally } from '#lib/binder/binder.ts';
	import { UI_ICONS } from '#lib/binder/icons.ts';
	import Icon from '#lib/components/Icon.svelte';
	import { fr } from '#lib/i18n/fr.ts';

	/**
	 * Reading progress of a subject or chapter, with what is new for the child. `barClass`: the
	 * bar colour (a text colour class: the bar is drawn in `currentColor`), primary by default.
	 */
	let { tally, barClass = 'progress-primary' }: { tally: Tally; barClass?: string } = $props();
</script>

<div class="flex flex-col gap-1">
	<progress class={['progress', barClass]} max={Math.max(tally.total, 1)} value={tally.read}
	></progress>
	<span class="flex flex-wrap items-center gap-2 text-sm text-base-content/70">
		{fr.binder.read(tally.read, tally.total)}
		{#if tally.acquired > 0}
			<span class="flex items-center gap-1">
				<span aria-hidden="true">·</span>
				<Icon paths={UI_ICONS.star} class="size-4 text-success" />
				{fr.binder.acquired(tally.acquired)}
			</span>
		{/if}
		{#if tally.fresh > 0}
			<span class="badge badge-secondary badge-sm">{fr.binder.fresh(tally.fresh)}</span>
		{/if}
	</span>
</div>
