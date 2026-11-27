<script lang="ts">
	import CopyButton from '#lib/components/CopyButton.svelte';
	import { fr } from '#lib/i18n/fr.ts';

	/** A prompt for the external AI, shown folded, with a copy button. */
	let { prompt }: { prompt: string } = $props();

	const t = fr.import;
</script>

<div class="flex flex-col gap-2">
	<CopyButton text={prompt} label={t.copy} />
	<details class="collapse-arrow collapse border border-base-300">
		<summary class="collapse-title text-sm">{t.prompt}</summary>
		<pre
			class="collapse-content max-h-64 overflow-auto font-mono text-xs whitespace-pre-wrap select-all">{prompt}</pre>
	</details>
</div>
