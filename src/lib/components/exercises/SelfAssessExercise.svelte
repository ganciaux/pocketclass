<script lang="ts">
	import { fr } from '#lib/i18n/fr.ts';
	import { renderMarkdown } from '#lib/render/markdown.ts';

	/**
	 * Self-assessed (pair card, paper exercise): reveal the answer, then say whether you knew it.
	 * `answer` null: no correction provided.
	 */
	let {
		answer,
		reveal,
		help,
		yes,
		no,
		onanswer
	}: {
		answer: string | null;
		reveal: string;
		help?: string;
		yes: string;
		no: string;
		onanswer: (correct: boolean) => void;
	} = $props();

	let shown = $state(false);
	let done = $state(false);

	function assess(correct: boolean) {
		done = true;
		onanswer(correct);
	}
</script>

<div class="flex flex-col gap-3">
	{#if help}<p class="text-sm text-base-content/60">{help}</p>{/if}
	{#if !shown}
		<button class="btn btn-secondary btn-lg" onclick={() => (shown = true)}>{reveal}</button>
	{:else}
		<div class="rounded-box border border-secondary/30 bg-secondary/5 p-4">
			{#if answer}
				<div class="prose">{@html renderMarkdown(answer)}</div>
			{:else}
				<p class="text-base-content/70">{fr.practice.noCorrection}</p>
			{/if}
		</div>
		{#if !done}
			<div class="grid grid-cols-2 gap-2">
				<button class="btn btn-success btn-soft min-h-12" onclick={() => assess(true)}>
					{yes}
				</button>
				<button class="btn btn-error btn-soft min-h-12" onclick={() => assess(false)}>{no}</button>
			</div>
		{/if}
	{/if}
</div>
