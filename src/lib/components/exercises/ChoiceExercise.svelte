<script lang="ts">
	import Icon from '#lib/components/Icon.svelte';
	import { UI_ICONS } from '#lib/binder/icons.ts';
	import { renderInline } from '#lib/render/markdown.ts';

	/**
	 * Buttons to pick one answer (mcq, true / false): tapping answers at once. Once answered, the
	 * right choice turns green and a wrong pick red.
	 */
	let {
		choices,
		answer,
		onanswer
	}: {
		choices: { label: string; value: string }[];
		answer: string;
		onanswer: (correct: boolean) => void;
	} = $props();

	let picked = $state<string | null>(null);

	function pick(value: string) {
		if (picked !== null) return;
		picked = value;
		onanswer(value === answer);
	}
</script>

<div class="flex flex-col gap-2">
	{#each choices as choice (choice.value)}
		{@const isAnswer = picked !== null && choice.value === answer}
		{@const isWrongPick = picked === choice.value && choice.value !== answer}
		<button
			class={[
				'btn h-auto min-h-12 justify-start py-2 text-start text-base font-normal normal-case',
				isAnswer && 'btn-success',
				isWrongPick && 'btn-error',
				picked === null && 'btn-outline'
			]}
			aria-pressed={picked === choice.value}
			disabled={picked !== null && !isAnswer && !isWrongPick}
			onclick={() => pick(choice.value)}
		>
			<span class="flex-1">{@html renderInline(choice.label)}</span>
			{#if isAnswer}<Icon paths={UI_ICONS.check} />{/if}
			{#if isWrongPick}<Icon paths={UI_ICONS.x} />{/if}
		</button>
	{/each}
</div>
