<script lang="ts">
	import { UI_ICONS } from '#lib/binder/icons.ts';
	import Icon from '#lib/components/Icon.svelte';
	import { onWriteFailure, type WriteFailure } from '#lib/data/writes.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { toast } from '#lib/motion.ts';

	/**
	 * A background write was refused (root layout): offline writes are not awaited, so without
	 * this the user would never know a result or a change was lost. Stays until dismissed.
	 */
	const t = fr.writes;
	let failure = $state<WriteFailure | null>(null);

	$effect(() => onWriteFailure((latest) => (failure = latest)));

	/** A finished run (series, challenge, assessment): its score and points are lost. */
	const isRun = (f: WriteFailure) => f.label.startsWith('practice');
</script>

{#if failure}
	<div class="toast toast-center toast-top z-30 mt-[calc(4rem+env(safe-area-inset-top))]">
		<div role="alert" class="alert alert-error shadow-lg" in:toast out:toast={{ exit: true }}>
			<Icon paths={UI_ICONS.alert} class="size-5" />
			<div class="flex flex-col">
				<strong>{isRun(failure) ? t.runLost : t.changeLost}</strong>
				<span class="text-sm">
					{failure.code === 'permission-denied' ? t.refusedHint : t.retryHint}
				</span>
			</div>
			<button class="btn btn-sm" onclick={() => (failure = null)}>{t.ok}</button>
		</div>
	</div>
{/if}
