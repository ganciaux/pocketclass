<script lang="ts">
	import { clozeParts } from '#lib/practice/answers.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { renderInline } from '#lib/render/markdown.ts';

	/** A text with typed blanks; every blank must be right. */
	let {
		text,
		check,
		onanswer
	}: {
		text: string;
		check: (given: string[]) => boolean;
		onanswer: (correct: boolean) => void;
	} = $props();

	const parts = $derived(clozeParts(text));
	const blanks = $derived(parts.filter((p) => 'blank' in p).length);
	let values = $state<string[]>([]);
	let done = $state(false);
	const complete = $derived(values.filter((v) => v?.trim()).length === blanks && blanks > 0);

	function submit(event: SubmitEvent) {
		event.preventDefault();
		if (done || !complete) return;
		done = true;
		onanswer(check(values));
	}
</script>

<form class="flex flex-col gap-3" onsubmit={submit}>
	<p class="prose text-lg leading-loose">
		{#each parts as part, i (i)}
			{#if 'blank' in part}
				<input
					class="input input-sm mx-1 inline-block w-32 align-baseline text-base"
					bind:value={values[part.blank]}
					disabled={done}
					autocomplete="off"
					autocapitalize="off"
					spellcheck="false"
					aria-label={fr.practice.blank(part.blank + 1)}
				/>
			{:else}
				{@html renderInline(part.text)}
			{/if}
		{/each}
	</p>
	{#if !done}
		<button class="btn btn-primary self-end" disabled={!complete}>{fr.practice.check}</button>
	{/if}
</form>
