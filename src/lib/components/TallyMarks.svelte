<script lang="ts">
	/**
	 * Days counted like on the blackboard: four strokes and a fifth across, in groups of five,
	 * slightly uneven like a hand-drawn line. Decorative: the number is written beside it.
	 */
	let { count, max = 30 }: { count: number; max?: number } = $props();

	const shown = $derived(Math.min(count, max));
	const groups = $derived(
		Array.from({ length: Math.ceil(shown / 5) }, (_, g) => Math.min(5, shown - g * 5))
	);
	/** Small fixed tilt per stroke (same drawing on every render). */
	const tilt = (i: number) => [-1.5, 1, -0.5, 1.5][i % 4];
</script>

<span class="inline-flex flex-wrap items-end gap-2" aria-hidden="true">
	{#each groups as strokes, g (g)}
		<svg
			viewBox="0 0 34 28"
			class="h-7 w-auto"
			fill="none"
			stroke="currentColor"
			stroke-width="2.6"
			stroke-linecap="round"
		>
			{#each Array.from({ length: Math.min(strokes, 4) }) as _, i (i)}
				<path d="M{5 + i * 7} 4 L{5 + i * 7 + tilt(i + g)} 24" />
			{/each}
			{#if strokes === 5}<path d="M1 20 L32 7" />{/if}
		</svg>
	{/each}
</span>
