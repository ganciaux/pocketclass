<script lang="ts">
	import { fr } from '#lib/i18n/fr.ts';
	import { shuffle } from '#lib/practice/series.ts';
	import { renderInline } from '#lib/render/markdown.ts';

	/** Choose a category for each item (one row of buttons per item). */
	let {
		categories,
		items,
		check,
		onanswer
	}: {
		categories: string[];
		items: { text: string; category: string }[];
		check: (given: string[]) => boolean;
		onanswer: (correct: boolean) => void;
	} = $props();

	// Items shown in a random order; answers kept in the exercise order.
	// svelte-ignore state_referenced_locally
	const shown = shuffle(items.map((item, index) => ({ text: item.text, index })));
	// svelte-ignore state_referenced_locally
	let chosen = $state<(string | null)[]>(items.map(() => null));
	let done = $state(false);
	const complete = $derived(chosen.every((c) => c !== null));

	function submit() {
		done = true;
		onanswer(check(chosen as string[]));
	}
</script>

<div class="flex flex-col gap-3">
	<p class="text-sm text-base-content/60">{fr.practice.categorizeHelp}</p>
	<ul class="flex flex-col gap-3" inert={done}>
		{#each shown as item (item.index)}
			<li class="flex flex-col gap-1.5 rounded-box border border-base-300 bg-base-100 p-3">
				<span class="font-bold">{@html renderInline(item.text)}</span>
				<div class="flex flex-wrap gap-1.5" role="group" aria-label={item.text}>
					{#each categories as category (category)}
						<button
							class={[
								'btn btn-sm min-h-11 font-normal normal-case',
								chosen[item.index] !== category
									? 'btn-outline'
									: !done
										? 'btn-primary'
										: category === items[item.index].category
											? 'btn-success'
											: 'btn-error'
							]}
							aria-pressed={chosen[item.index] === category}
							onclick={() => (chosen[item.index] = category)}
						>
							{@html renderInline(category)}
						</button>
					{/each}
				</div>
			</li>
		{/each}
	</ul>
	{#if !done}
		<button class="btn btn-primary self-end" disabled={!complete} onclick={submit}>
			{fr.practice.check}
		</button>
	{/if}
</div>
