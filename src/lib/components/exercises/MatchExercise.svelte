<script lang="ts">
	import { fr } from '#lib/i18n/fr.ts';
	import { shuffle } from '#lib/practice/series.ts';
	import { renderInline } from '#lib/render/markdown.ts';

	/**
	 * Link each left item to a right item: tap a left, then a right. Linked items share a number;
	 * tapping a linked left picks it again (to change its link).
	 */
	let {
		pairs,
		check,
		onanswer
	}: {
		pairs: { left: string; right: string }[];
		check: (given: string[]) => boolean;
		onanswer: (correct: boolean) => void;
	} = $props();

	// svelte-ignore state_referenced_locally
	const lefts = shuffle(pairs.map((p, i) => ({ text: p.left, index: i })));
	// svelte-ignore state_referenced_locally
	const rights = shuffle(pairs.map((p) => p.right));
	/** Number shown for each left: its place in the shuffled column. */
	const number = new Map(lefts.map((l, n) => [l.index, n + 1]));

	/** The right linked to each pair (exercise order), or null. */
	// svelte-ignore state_referenced_locally
	let links = $state<(string | null)[]>(pairs.map(() => null));
	let selected = $state<number | null>(lefts[0]?.index ?? null);
	let done = $state(false);
	const complete = $derived(links.every((l) => l !== null));

	function pickRight(right: string) {
		if (done || selected === null) return;
		links = links.map((l, i) => (i === selected ? right : l === right ? null : l));
		// Next left without a link, if any.
		selected = lefts.find((l) => links[l.index] === null)?.index ?? null;
	}

	const linkedTo = (right: string) => {
		const i = links.indexOf(right);
		return i === -1 ? null : number.get(i);
	};

	function submit() {
		done = true;
		onanswer(check(links as string[]));
	}
</script>

<div class="flex flex-col gap-3">
	<p class="text-sm text-base-content/60">{fr.practice.matchHelp}</p>
	<!-- Once answered: read-only (inert, not greyed), each link marked right or wrong. -->
	<div class="grid grid-cols-2 gap-2" inert={done}>
		<ul class="flex flex-col gap-2">
			{#each lefts as left (left.index)}
				<li>
					<button
						class={[
							'btn h-auto min-h-12 w-full justify-start py-2 text-start font-normal normal-case',
							done
								? links[left.index] === pairs[left.index].right
									? 'btn-success btn-soft'
									: 'btn-error btn-soft'
								: selected === left.index
									? 'btn-primary'
									: 'btn-outline'
						]}
						aria-pressed={selected === left.index}
						onclick={() => (selected = left.index)}
					>
						<span class="badge badge-sm font-bold">{number.get(left.index)}</span>
						<span class="flex-1">{@html renderInline(left.text)}</span>
					</button>
				</li>
			{/each}
		</ul>
		<ul class="flex flex-col gap-2">
			{#each rights as right (right)}
				{@const n = linkedTo(right)}
				<li>
					<button
						class={[
							'btn h-auto min-h-12 w-full justify-start py-2 text-start font-normal normal-case',
							n ? 'btn-secondary btn-soft' : 'btn-outline'
						]}
						onclick={() => pickRight(right)}
					>
						<span class="flex-1">{@html renderInline(right)}</span>
						{#if n}
							<span class="badge badge-sm font-bold">
								{n}<span class="sr-only">{fr.practice.matchLinked(n)}</span>
							</span>
						{/if}
					</button>
				</li>
			{/each}
		</ul>
	</div>
	{#if !done}
		<button class="btn btn-primary self-end" disabled={!complete} onclick={submit}>
			{fr.practice.check}
		</button>
	{/if}
</div>
