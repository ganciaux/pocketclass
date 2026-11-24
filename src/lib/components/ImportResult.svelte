<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fr } from '#lib/i18n/fr.ts';
	import type { ImportPlan } from '#lib/import/sheetPlan.ts';

	/** What the last import did. */
	let { plan, children }: { plan: ImportPlan; children?: Snippet } = $props();
</script>

<div class="alert alert-success alert-soft flex-col items-start" aria-live="polite">
	<p>{fr.import.done(plan.stats.created, plan.stats.updated)}</p>
	{#if plan.stats.archivedExercises > 0}
		<p class="text-sm">{fr.import.archived(plan.stats.archivedExercises)}</p>
	{/if}
	{@render children?.()}
</div>
