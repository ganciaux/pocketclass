<script lang="ts">
	import LoadState from '#lib/components/LoadState.svelte';
	import { watchActiveConcepts } from '#lib/data/catalog.ts';
	import { live } from '#lib/data/live.svelte.ts';
	import { watchProgress } from '#lib/data/progress.ts';
	import { combine } from '#lib/data/sources.ts';
	import { formatDate, fr } from '#lib/i18n/fr.ts';
	import { percent, practicedSheets } from '#lib/practice/scores.ts';
	import { renderInline } from '#lib/render/markdown.ts';
	import { resolve } from '$app/paths';

	/** Parent view of a child: last and best practice score of each sheet practised. */
	let { familyId, profileId }: { familyId: string; profileId: string } = $props();

	const t = fr.practice;
	const dataLive = live(() =>
		combine({
			sheets: watchActiveConcepts(familyId),
			progress: watchProgress(familyId, profileId)
		})
	);
</script>

<LoadState source={dataLive} failed={t.loadFailed}>
	{#snippet children(data)}
		{@const rows = practicedSheets(data.sheets, data.progress)}
		{#if rows.length === 0}
			<p class="text-sm text-base-content/60">{t.noScores}</p>
		{:else}
			<ul class="flex flex-col gap-2">
				{#each rows as row (row.sheet.id)}
					<li>
						<a
							class="card card-border flex-row items-center gap-3 bg-base-100 p-3 hover:bg-base-200"
							href={resolve('/concept/[id]', { id: row.sheet.id })}
						>
							<span class="flex min-w-0 flex-1 flex-col">
								<strong class="truncate">{@html renderInline(row.sheet.title)}</strong>
								<span class="text-sm text-base-content/60">
									{t.last(t.score(row.last.correct, row.last.total))}
									{#if row.at}· {formatDate(new Date(row.at))}{/if}
								</span>
							</span>
							<span class="flex flex-col items-end">
								<span class="text-lg font-bold text-primary">{percent(row.best)} %</span>
								<span class="text-xs text-base-content/60">{t.bestLabel}</span>
							</span>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	{/snippet}
</LoadState>
