<script lang="ts">
	import { fr } from '#lib/i18n/fr.ts';

	/** A prompt for the external AI, shown folded, with a copy button. */
	let { prompt }: { prompt: string } = $props();

	const t = fr.import;
	let status = $state<'idle' | 'copied' | 'failed'>('idle');

	async function copy() {
		try {
			await navigator.clipboard.writeText(prompt);
			status = 'copied';
		} catch (error) {
			console.error('[prompt] copy failed', error);
			status = 'failed';
		}
	}
</script>

<div class="flex flex-col gap-2">
	<div class="flex flex-wrap items-center gap-2">
		<button class="btn btn-secondary btn-sm" type="button" onclick={copy}>{t.copy}</button>
		{#if status === 'copied'}<span class="text-sm text-success">{t.copied}</span>{/if}
	</div>
	{#if status === 'failed'}<p class="alert alert-warning alert-soft">{t.copyFailed}</p>{/if}
	<details class="collapse-arrow collapse border border-base-300">
		<summary class="collapse-title text-sm">{t.prompt}</summary>
		<pre
			class="collapse-content max-h-64 overflow-auto font-mono text-xs whitespace-pre-wrap select-all">{prompt}</pre>
	</details>
</div>
