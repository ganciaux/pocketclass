<script lang="ts">
	import { fr } from '#lib/i18n/fr.ts';

	/** One typed answer (calculation, open question), checked with « Valider » or Enter. */
	let {
		check,
		onanswer
	}: {
		check: (given: string) => boolean;
		onanswer: (correct: boolean) => void;
	} = $props();

	let value = $state('');
	let done = $state(false);

	function submit(event: SubmitEvent) {
		event.preventDefault();
		if (done || !value.trim()) return;
		done = true;
		onanswer(check(value));
	}
</script>

<form class="flex gap-2" onsubmit={submit}>
	<!-- svelte-ignore a11y_autofocus -->
	<input
		class="input input-lg w-full"
		bind:value
		disabled={done}
		autocomplete="off"
		autocapitalize="off"
		spellcheck="false"
		autofocus
		aria-label={fr.practice.answerPlaceholder}
		placeholder={fr.practice.answerPlaceholder}
	/>
	{#if !done}
		<button class="btn btn-primary btn-lg" disabled={!value.trim()}>{fr.practice.check}</button>
	{/if}
</form>
