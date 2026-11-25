<script lang="ts">
	import { SUBJECT_TEXT } from '#lib/binder/colors.ts';
	import type { SubjectColor } from '#lib/data/types.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import type { Branch } from '#lib/mindmap/mindmap.ts';
	import { drawLine } from '#lib/motion.ts';
	import { renderInline } from '#lib/render/markdown.ts';

	/**
	 * A sheet's mind map on squared paper: the notion highlighted in the centre, one branch per
	 * key point (number, label, leaves), drawn in the subject's ink. Wide screens: branches on
	 * both sides, joined by measured SVG curves. Phones: a tree going down.
	 */
	let {
		title,
		branches,
		color,
		cantest,
		ontest
	}: {
		title: string;
		branches: Branch[];
		color: SubjectColor;
		/** Whether a branch has questions (its « Me tester » button). */
		cantest: (keyPoint: string) => boolean;
		ontest: (keyPoint: string) => void;
	} = $props();

	const t = fr.mindMap;
	// Clockwise from the top right: the first half on the right, the rest on the left.
	const right = $derived(branches.slice(0, Math.ceil(branches.length / 2)));
	const left = $derived(branches.slice(Math.ceil(branches.length / 2)));

	let wide = $state<HTMLElement>();
	let centre = $state<HTMLElement>();
	let curves = $state<{ key: string; d: string }[]>([]);
	let size = $state({ width: 0, height: 0 });

	/** Curves from the centre's side to each branch, measured on the laid-out page. */
	function measure() {
		if (!wide || !centre) return;
		const box = wide.getBoundingClientRect();
		size = { width: box.width, height: box.height };
		const c = centre.getBoundingClientRect();
		const cy = c.top + c.height / 2 - box.top;
		curves = [...wide.querySelectorAll<HTMLElement>('[data-branch]')].map((node) => {
			const b = node.getBoundingClientRect();
			const onRight = b.left > c.left;
			const x1 = (onRight ? c.right : c.left) - box.left;
			const x2 = (onRight ? b.left : b.right) - box.left;
			const y2 = b.top + Math.min(28, b.height / 2) - box.top;
			const bend = (x2 - x1) / 2;
			return {
				key: node.dataset.branch!,
				d: `M${x1},${cy} C${x1 + bend},${cy} ${x2 - bend},${y2} ${x2},${y2}`
			};
		});
	}

	$effect(() => {
		if (!wide) return;
		void branches;
		const observer = new ResizeObserver(measure);
		observer.observe(wide);
		measure();
		return () => observer.disconnect();
	});
</script>

{#snippet branchNode(branch: Branch)}
	<div
		class="flex flex-col gap-2 rounded-box border-2 border-current bg-base-100 p-3"
		data-branch={branch.keyPoint}
	>
		<p class="flex items-start gap-2 font-bold text-base-content">
			<span class="badge badge-primary badge-sm mt-0.5 rounded-full font-bold">
				{branch.number}
			</span>
			<span>{@html renderInline(branch.label)}</span>
		</p>
		{#if branch.leaves.length > 0}
			<ul class="flex flex-wrap gap-1.5">
				{#each branch.leaves as leaf, i (i)}
					<li class="rounded-md bg-base-200 px-2 py-0.5 text-sm text-base-content">
						{@html renderInline(leaf)}
					</li>
				{/each}
			</ul>
		{/if}
		{#if cantest(branch.keyPoint)}
			<button
				class="btn btn-soft btn-primary btn-xs self-start"
				onclick={() => ontest(branch.keyPoint)}
			>
				{t.testBranch}
			</button>
		{/if}
	</div>
{/snippet}

<!-- Wider than the text column on large screens: a map needs room on both sides. -->
<section
	class={[
		'squared-paper rounded-box border border-base-300 p-4 sm:p-6 lg:w-[min(64rem,calc(100vw_-_2rem))] lg:self-center',
		SUBJECT_TEXT[color]
	]}
>
	<!-- Phones: the notion on top, the branches going down a hand-drawn line. -->
	<div class="lg:hidden">
		<h1 class="text-base-content"><span class="highlighter">{@html renderInline(title)}</span></h1>
		<ul class="mt-1 ms-3">
			{#each branches as branch (branch.keyPoint)}
				<li
					class="relative ps-7 pt-3 before:absolute before:start-0 before:top-0 before:h-10 before:w-5 before:rounded-es-xl before:border-s-2 before:border-b-2 before:border-current after:absolute after:start-0 after:top-10 after:bottom-0 after:border-s-2 after:border-current last:after:hidden"
				>
					{@render branchNode(branch)}
				</li>
			{/each}
		</ul>
	</div>

	<!-- Wide screens: the notion in the middle, the branches around it. -->
	<div
		bind:this={wide}
		class="relative hidden grid-cols-[1fr_minmax(10rem,14rem)_1fr] items-center gap-x-12 lg:grid"
	>
		<svg
			class="pointer-events-none absolute inset-0 overflow-visible"
			width={size.width}
			height={size.height}
			aria-hidden="true"
		>
			{#each curves as curve (curve.key)}
				<path
					in:drawLine
					d={curve.d}
					pathLength="1"
					fill="none"
					stroke="currentColor"
					stroke-width="3"
					stroke-linecap="round"
				/>
			{/each}
		</svg>
		<div class="relative flex flex-col gap-6">
			{#each left as branch (branch.keyPoint)}{@render branchNode(branch)}{/each}
		</div>
		<div bind:this={centre} class="relative text-center">
			<h1 class="text-base-content">
				<span class="highlighter">{@html renderInline(title)}</span>
			</h1>
		</div>
		<div class="relative flex flex-col gap-6">
			{#each right as branch (branch.keyPoint)}{@render branchNode(branch)}{/each}
		</div>
	</div>
</section>
