<script lang="ts">
	import { UI_ICONS } from '#lib/binder/icons.ts';
	import { ticking } from '#lib/clock.svelte.ts';
	import Icon from '#lib/components/Icon.svelte';
	import { fr } from '#lib/i18n/fr.ts';
	import {
		revisionPoints,
		revisionStatus,
		timeLeft,
		type RevisionProgress
	} from '#lib/practice/revision.ts';

	/**
	 * Revision of an acquired sheet: « ready » (a series at 70 % earns points) or the hourglass
	 * with the time left. Nothing before the sheet is acquired.
	 */
	let {
		progress,
		keyPointCount
	}: { progress: RevisionProgress | null | undefined; keyPointCount: number } = $props();

	const t = fr.revision;
	const clock = ticking();
	const status = $derived(revisionStatus(progress, clock.now));
</script>

{#if status.kind === 'ready'}
	<p class="alert alert-success alert-soft">
		<Icon paths={UI_ICONS.star} class="size-5" />
		<span>{t.ready(revisionPoints(keyPointCount))}</span>
	</p>
{:else if status.kind === 'waiting'}
	<p class="alert alert-soft">
		<Icon paths={UI_ICONS.hourglass} class="size-5 text-secondary" />
		<span>{t.waiting(t.left(timeLeft(status.readyAt - clock.now)))}</span>
	</p>
{/if}
