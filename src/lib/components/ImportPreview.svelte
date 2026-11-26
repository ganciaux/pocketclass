<script lang="ts">
	import { resolve } from '$app/paths';
	import { untrack } from 'svelte';
	import { ImportConflictError, readExistingSheets } from '#lib/data/importSheets.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import {
		findSheetConflicts,
		sheetStats,
		type ExistingSheets,
		type SheetConflict
	} from '#lib/import/sheetPlan.ts';
	import { connectivity } from '#lib/online.svelte.ts';
	import { renderInline } from '#lib/render/markdown.ts';
	import type { SheetDoc } from '#lib/schemas/sheet.ts';

	/**
	 * Preview of the sheets about to be imported (new or update, conflicts with other chapters)
	 * and the import button. `chapterId`: target chapter, null for a new one. `onimport` runs
	 * the import; the page shows the result (this preview disappears with the pasted JSON).
	 */
	let {
		familyId,
		sheets,
		chapterId,
		submitLabel,
		onimport
	}: {
		familyId: string;
		sheets: SheetDoc[];
		chapterId: string | null;
		submitLabel: string;
		onimport: () => Promise<void>;
	} = $props();

	const t = fr.import;

	let existing = $state<ExistingSheets | null>(null);
	let checkFailed = $state(false);
	let importing = $state(false);
	let failed = $state(false);
	let raisedConflicts = $state<SheetConflict[]>([]);

	// Existing sheets, read from the server when the ids change (a primitive key), not on
	// every keystroke.
	const idsKey = $derived(sheets.map((s) => s.id).join(','));
	$effect(() => {
		const ids = idsKey ? idsKey.split(',') : [];
		existing = null;
		checkFailed = false;
		raisedConflicts = [];
		let cancelled = false;
		readExistingSheets(
			untrack(() => familyId),
			ids
		)
			.then((found) => !cancelled && (existing = found))
			.catch((error) => {
				console.error('[import] existing sheets', error);
				if (!cancelled) checkFailed = true;
			});
		return () => (cancelled = true);
	});

	const conflicts = $derived(
		raisedConflicts.length > 0
			? raisedConflicts
			: existing
				? findSheetConflicts(sheets, chapterId ?? '', existing)
				: []
	);
	const canImport = $derived(
		!importing && connectivity.online && existing !== null && conflicts.length === 0
	);

	async function run() {
		importing = true;
		failed = false;
		try {
			await onimport();
		} catch (error) {
			console.error('[import] failed', error);
			if (error instanceof ImportConflictError) raisedConflicts = error.conflicts;
			else failed = true;
		} finally {
			importing = false;
		}
	}
</script>

<ul class="flex flex-col gap-2">
	{#each sheets as sheet (sheet.id)}
		{@const stats = sheetStats(sheet)}
		{@const old = existing?.[sheet.id]}
		<li class="flex flex-col rounded-box border border-base-300 p-3">
			<span class="flex items-start justify-between gap-2">
				<strong>{@html renderInline(sheet.title)}</strong>
				{#if existing}
					<span class={['badge badge-sm shrink-0', old ? 'badge-warning' : 'badge-secondary']}>
						{old ? t.isUpdate(old.version) : t.isNew}
					</span>
				{/if}
			</span>
			<span class="font-mono text-xs text-base-content/60">{sheet.id}</span>
			<span class="text-sm text-base-content/70">
				{t.sheetLine(stats.keyPoints, stats.practice, stats.assessment)}
			</span>
		</li>
	{/each}
</ul>

{#if conflicts.length > 0 || checkFailed}
	<ul role="alert" class="alert alert-error alert-soft flex-col items-start" aria-live="polite">
		{#each conflicts as c (c.sheetId)}
			<li>
				{t.conflict(c.sheetId, c.chapterTitle)}
				<a class="link font-bold" href={resolve('/parent/chapters/[id]', { id: c.chapterId })}>
					{t.openConflictChapter}
				</a>
			</li>
		{/each}
		{#if checkFailed}<li>{t.checkFailed}</li>{/if}
	</ul>
{/if}
{#if !connectivity.online}<p class="alert alert-warning alert-soft">{t.offline}</p>{/if}
{#if failed}<p role="alert" class="alert alert-error alert-soft">{t.failed}</p>{/if}
<button class="btn btn-primary self-start" onclick={run} disabled={!canImport}>
	{importing ? t.importing : submitLabel}
</button>
