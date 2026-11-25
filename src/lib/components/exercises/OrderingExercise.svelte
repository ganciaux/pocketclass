<script lang="ts">
	import { flip } from 'svelte/animate';
	import { fr } from '#lib/i18n/fr.ts';
	import { scramble } from '#lib/practice/series.ts';
	import { renderInline } from '#lib/render/markdown.ts';

	/** Put items back in order with ↑ ↓ (no drag: works the same on every phone). */
	let {
		items,
		check,
		onanswer
	}: {
		items: string[];
		check: (given: string[]) => boolean;
		onanswer: (correct: boolean) => void;
	} = $props();

	// Scrambled once, when the exercise is shown (the player recreates it for each question).
	// Keyed by position: the same text may appear twice (« -e » for je and il).
	// svelte-ignore state_referenced_locally
	let order = $state(scramble(items.map((text, index) => ({ text, index }))));
	let done = $state(false);
	const reduce =
		typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

	function move(from: number, to: number) {
		const next = [...order];
		[next[from], next[to]] = [next[to], next[from]];
		order = next;
	}

	function submit() {
		done = true;
		onanswer(check(order.map((item) => item.text)));
	}
</script>

<div class="flex flex-col gap-3">
	<p class="text-sm text-base-content/60">{fr.practice.orderHelp}</p>
	<ol class="flex flex-col gap-2">
		{#each order as item, i (item.index)}
			<li
				class="flex items-center gap-2 rounded-box border border-base-300 bg-base-100 p-2"
				animate:flip={{ duration: reduce ? 0 : 180 }}
			>
				<span class="badge badge-ghost font-bold">{i + 1}</span>
				<span class="flex-1">{@html renderInline(item.text)}</span>
				{#if !done}
					<button
						type="button"
						class="btn btn-square btn-ghost"
						aria-label={fr.practice.moveUp}
						disabled={i === 0}
						onclick={() => move(i, i - 1)}
					>
						↑
					</button>
					<button
						type="button"
						class="btn btn-square btn-ghost"
						aria-label={fr.practice.moveDown}
						disabled={i === order.length - 1}
						onclick={() => move(i, i + 1)}
					>
						↓
					</button>
				{/if}
			</li>
		{/each}
	</ol>
	{#if !done}
		<button class="btn btn-primary self-end" onclick={submit}>{fr.practice.check}</button>
	{/if}
</div>
