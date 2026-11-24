<script lang="ts">
	import type { Tally } from '#lib/binder/binder.ts';
	import { fr } from '#lib/i18n/fr.ts';

	/** Reading progress of a subject or chapter, with what is new for the child. */
	let { tally }: { tally: Tally } = $props();
</script>

<div class="flex flex-col gap-1">
	<progress class="progress progress-primary" max={Math.max(tally.total, 1)} value={tally.read}
	></progress>
	<span class="flex flex-wrap items-center gap-2 text-sm text-base-content/70">
		{fr.binder.read(tally.read, tally.total)}
		{#if tally.fresh > 0}
			<span class="badge badge-secondary badge-sm">{fr.binder.fresh(tally.fresh)}</span>
		{/if}
	</span>
</div>
