<script lang="ts">
	import { STATUS_CHIP, SUBJECT_TILE } from '#lib/binder/colors.ts';
	import { UI_ICONS } from '#lib/binder/icons.ts';
	import Icon from '#lib/components/Icon.svelte';
	import type { SubjectColor } from '#lib/data/types.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { readPreference, writePreference } from '#lib/preferences.ts';
	import { renderInline, renderMarkdown } from '#lib/render/markdown.ts';
	import type { KeyPoint, SheetDoc } from '#lib/schemas/sheet.ts';

	/**
	 * The body of a sheet as the child reads it: numbered key points (each links to its first
	 * section), sections (« Détails | Résumé » when they have summaries, examples folded) and
	 * pitfalls. Used by the sheet page and by the import preview (`idPrefix` keeps the section
	 * ids unique when several are on one page).
	 */
	let {
		keyPoints,
		sheet,
		color,
		idPrefix = ''
	}: {
		keyPoints: KeyPoint[];
		sheet: SheetDoc['sheet'];
		color: SubjectColor;
		idPrefix?: string;
	} = $props();

	const t = fr.concept;

	/**
	 * « Résumé »: each section's bullets instead of its text. The switch at the top sets every
	 * section (remembered on this device); a section's own switch changes that section only, so
	 * nobody scrolls back up to change it (and nothing above it moves).
	 */
	let summaryView = $state(readPreference('sheetView') === 'summary');
	let sectionView = $state<Record<number, boolean>>({});
	function setSummaryView(on: boolean) {
		summaryView = on;
		sectionView = {};
		writePreference('sheetView', on ? 'summary' : 'details');
	}
	const showsSummary = (s: number) => sectionView[s] ?? summaryView;
	const hasSummary = $derived(sheet.sections.some((section) => section.summary));

	/** Key point number (1-based) shown as a badge next to each section. */
	const keyPointNumber = $derived(new Map(keyPoints.map((kp, i) => [kp.id, i + 1])));

	/** Key point id → number (1-based) of the first section that covers it. */
	const keyPointSection = $derived.by(() => {
		const first = new Map<string, number>();
		sheet.sections.forEach((section, s) => {
			for (const kp of section.keyPoints) if (!first.has(kp)) first.set(kp, s + 1);
		});
		return first;
	});

	/** Scrolls to a section (below the sticky header) and moves the focus to it. */
	function goToSection(event: MouseEvent, n: number) {
		const target = document.getElementById(`${idPrefix}section-${n}`);
		if (!target) return;
		event.preventDefault();
		const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
		target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
		target.focus({ preventScroll: true });
	}
</script>

<!-- Key points are numbered: the sections below refer to them by number. -->
<section class="card border border-primary/40 bg-primary/10">
	<div class="card-body gap-2">
		<h2 class="card-title">
			<Icon paths={UI_ICONS.bookmark} class="size-5 text-primary" />
			{t.keyPoints}
		</h2>
		<ol class="flex flex-col gap-2">
			{#each keyPoints as kp, i (kp.id)}
				{@const section = keyPointSection.get(kp.id)}
				<li>
					<!-- The whole row links to the first section about this key point. -->
					{#if section}
						<a
							class="link-row -mx-2 flex gap-3 px-2 py-1"
							href="#{idPrefix}section-{section}"
							onclick={(event) => goToSection(event, section)}
						>
							<span class="link-lead badge badge-primary badge-sm mt-0.5 rounded-full font-bold">
								{i + 1}
							</span>
							<span>
								{@html renderInline(kp.label)}
								<span class="sr-only">{t.goToSection(section)}</span>
							</span>
						</a>
					{:else}
						<span class="flex gap-3 py-1">
							<span class="badge badge-primary badge-sm mt-0.5 rounded-full font-bold">
								{i + 1}
							</span>
							<span>{@html renderInline(kp.label)}</span>
						</span>
					{/if}
				</li>
			{/each}
		</ol>
	</div>
</section>

<!-- « Détails | Résumé »: the whole sheet at the top, one section in its header. -->
{#snippet viewSwitch(summary: boolean, set: (on: boolean) => void, label: string, size: string)}
	<div class="join" role="group" aria-label={label}>
		<button
			class={['join-item btn', size, summary ? STATUS_CHIP.all.off : STATUS_CHIP.all.on]}
			aria-pressed={!summary}
			onclick={() => set(false)}
		>
			{t.viewDetails}
		</button>
		<button
			class={['join-item btn', size, summary ? STATUS_CHIP.all.on : STATUS_CHIP.all.off]}
			aria-pressed={summary}
			onclick={() => set(true)}
		>
			{t.viewSummary}
		</button>
	</div>
{/snippet}

{#if hasSummary}
	<div class="self-center">
		{@render viewSwitch(summaryView, setSummaryView, t.viewLabel, 'btn-sm')}
	</div>
{/if}

{#each sheet.sections as section, s (s)}
	<!-- Target of the key point links: kept clear of the sticky header. -->
	<section
		id="{idPrefix}section-{s + 1}"
		tabindex="-1"
		class="card card-border scroll-mt-[calc(4.5rem+env(safe-area-inset-top))] bg-base-100 outline-none"
	>
		<div class="card-body gap-3">
			<header class="flex items-start gap-3">
				<span
					class={[
						'grid size-10 shrink-0 place-items-center rounded-full text-lg font-bold',
						SUBJECT_TILE[color]
					]}
					aria-hidden="true"
				>
					{s + 1}
				</span>
				<div class="flex min-w-0 flex-1 flex-col">
					<span class="text-sm font-bold text-base-content/50">
						{t.section(s + 1, sheet.sections.length)}
					</span>
					<h2 class="card-title">{@html renderInline(section.title)}</h2>
				</div>
				<span class="flex gap-1 pt-1">
					{#each section.keyPoints as kp (kp)}
						<span class="badge badge-primary badge-sm rounded-full font-bold">
							{keyPointNumber.get(kp)}
						</span>
					{/each}
				</span>
			</header>
			{#if section.summary}
				<div class="self-end">
					{@render viewSwitch(
						showsSummary(s),
						(on) => (sectionView = { ...sectionView, [s]: on }),
						t.sectionViewLabel(s + 1),
						'btn-xs'
					)}
				</div>
			{/if}
			{#if showsSummary(s) && section.summary}
				<ul class="prose list-disc pl-5">
					{#each section.summary as point, p (p)}
						<li>{@html renderInline(point)}</li>
					{/each}
				</ul>
			{:else}
				<div class="prose">{@html renderMarkdown(section.text)}</div>
			{/if}

			{#each section.examples as example, e (e)}
				<details class="collapse-arrow collapse border border-secondary/30 bg-secondary/5">
					<summary class="collapse-title prose flex flex-col gap-1">
						<span class="flex items-center gap-1.5 text-sm font-bold text-secondary">
							<Icon paths={UI_ICONS.lightbulb} class="size-4" />
							{t.example(e + 1)}
						</span>
						<span>{@html renderInline(example.statement)}</span>
						<span class="text-sm text-base-content/60 underline underline-offset-2">
							{t.showSolution}
						</span>
					</summary>
					<div class="collapse-content prose border-t border-dashed border-secondary/30 pt-3">
						{@html renderMarkdown(example.solution)}
					</div>
				</details>
			{/each}
		</div>
	</section>
{/each}

{#if sheet.pitfalls.length > 0}
	<section class="card border border-warning/40 bg-warning/10">
		<div class="card-body gap-2">
			<h2 class="card-title">
				<Icon paths={UI_ICONS.alert} class="size-5 text-warning" />
				{t.pitfalls}
			</h2>
			<ul class="list-disc space-y-1 pl-5">
				{#each sheet.pitfalls as pitfall, p (p)}
					<li>{@html renderInline(pitfall)}</li>
				{/each}
			</ul>
		</div>
	</section>
{/if}
