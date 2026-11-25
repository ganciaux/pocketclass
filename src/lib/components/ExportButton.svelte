<script lang="ts">
	import { UI_ICONS } from '#lib/binder/icons.ts';
	import Icon from '#lib/components/Icon.svelte';
	import { fr } from '#lib/i18n/fr.ts';

	/**
	 * Downloads a JSON export (sheet, chapter, subject, binders). `load` reads the content when
	 * the button is pressed (nothing is read before).
	 */
	let { label, fileName, load }: { label: string; fileName: string; load: () => Promise<unknown> } =
		$props();

	let busy = $state(false);
	let failed = $state(false);

	async function run() {
		busy = true;
		failed = false;
		try {
			const json = JSON.stringify(await load(), null, 2);
			const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
			const link = document.createElement('a');
			link.href = url;
			link.download = fileName;
			link.click();
			setTimeout(() => URL.revokeObjectURL(url), 1000);
		} catch (error) {
			console.error('[export]', error);
			failed = true;
		} finally {
			busy = false;
		}
	}
</script>

<button class="btn btn-ghost btn-sm self-start" onclick={run} disabled={busy}>
	{#if busy}
		<span class="loading loading-spinner loading-sm"></span>
	{:else}
		<Icon paths={UI_ICONS.download} class="size-4" />
	{/if}
	{label}
</button>
{#if failed}<p role="alert" class="alert alert-error alert-soft">{fr.export.failed}</p>{/if}
