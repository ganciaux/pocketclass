<script lang="ts">
	import { layoutFigure } from '#lib/figures/layout.ts';
	import { renderInline } from '#lib/render/markdown.ts';
	import type { Figure } from '#lib/schemas/figure.ts';

	/**
	 * A geometry figure drawn by the app (`figures/layout.ts`) from the AI's description: pencil
	 * lines in the text colour (readable on both themes), point names, right-angle squares and
	 * lengths. Never larger than its natural size, smaller on a narrow screen.
	 */
	let { figure }: { figure: Figure } = $props();

	const layout = $derived(layoutFigure(figure));
</script>

<figure class="flex flex-col items-center gap-1">
	<svg
		viewBox={layout.viewBox}
		width={layout.width}
		class="h-auto max-w-full text-base-content"
		role="img"
		aria-label={figure.caption ?? Object.keys(figure.points).join(', ')}
	>
		<g stroke="currentColor" stroke-width="2" stroke-linecap="round">
			{#each layout.segments as s, i (i)}
				<line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} />
			{/each}
		</g>
		<g stroke="currentColor" stroke-width="1.5" fill="none">
			{#each layout.rightAngles as path, i (i)}<path d={path} />{/each}
		</g>
		{#each layout.points as p (p.name)}
			<circle cx={p.x} cy={p.y} r="2.5" fill="currentColor" />
			<text x={p.nameX} y={p.nameY} text-anchor="middle" class="fill-current text-[13px] font-bold">
				{p.name}
			</text>
		{/each}
		{#each layout.labels as label, i (i)}
			<text
				x={label.x}
				y={label.y}
				text-anchor={label.anchor}
				class="fill-secondary text-[12px] font-bold"
			>
				{label.text}
			</text>
		{/each}
	</svg>
	{#if figure.caption}
		<figcaption class="text-sm text-base-content/70">
			{@html renderInline(figure.caption)}
		</figcaption>
	{/if}
</figure>
