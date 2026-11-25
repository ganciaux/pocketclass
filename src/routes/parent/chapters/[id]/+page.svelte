<script lang="ts">
	import ExportButton from '#lib/components/ExportButton.svelte';
	import { exportChapter } from '#lib/data/catalogExport.ts';
	import { exportFileName } from '#lib/import/catalogExport.ts';
	import BackLink from '#lib/components/BackLink.svelte';
	import { session } from '#lib/auth.svelte.ts';
	import { activeOnly, groupNames, moveItem } from '#lib/binder/binder.ts';
	import ChapterSettings from '#lib/components/ChapterSettings.svelte';
	import ConfirmDelete from '#lib/components/ConfirmDelete.svelte';
	import ConfirmDeleteDialog from '#lib/components/ConfirmDeleteDialog.svelte';
	import ImportPreview from '#lib/components/ImportPreview.svelte';
	import ImportResult from '#lib/components/ImportResult.svelte';
	import JsonPaste from '#lib/components/JsonPaste.svelte';
	import LoadState from '#lib/components/LoadState.svelte';
	import OrderActions from '#lib/components/OrderActions.svelte';
	import PromptCopy from '#lib/components/PromptCopy.svelte';
	import {
		watchChapter,
		watchChaptersOf,
		watchSheetsOf,
		watchSheetsOfSubject,
		watchSubject
	} from '#lib/data/catalog.ts';
	import { deleteChapter, deleteSheet } from '#lib/data/catalogDelete.ts';
	import { saveOrder, setArchived } from '#lib/data/catalogEdit.ts';
	import { importSheets } from '#lib/data/importSheets.ts';
	import { live } from '#lib/data/live.svelte.ts';
	import type { Chapter, ConceptRecord, WithId } from '#lib/data/types.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { reorder, row } from '#lib/motion.ts';
	import type { ImportPlan } from '#lib/import/sheetPlan.ts';
	import { sheetPrompt } from '#lib/prompts/sheetPrompt.ts';
	import { renderInline } from '#lib/render/markdown.ts';
	import { sheetSchema, type SheetImport } from '#lib/schemas/sheet.ts';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	const t = fr.manage;
	const ti = fr.import;
	const chapterId = $derived(page.params.id ?? '');
	const chapterLive = live(
		() => session.familyId && chapterId && watchChapter(session.familyId, chapterId, true)
	);
	const sheetsLive = live(
		() => session.familyId && chapterId && watchSheetsOf(session.familyId, chapterId)
	);
	const subjectId = $derived(chapterLive.data?.subjectId);
	const subjectLive = live(
		() => session.familyId && subjectId && watchSubject(session.familyId, subjectId, true)
	);
	const siblingsLive = live(
		() => session.familyId && subjectId && watchChaptersOf(session.familyId, subjectId)
	);
	const subjectSheetsLive = live(
		() => session.familyId && subjectId && watchSheetsOfSubject(session.familyId, subjectId)
	);

	function move(sheets: WithId<ConceptRecord>[], id: string, step: -1 | 1) {
		if (session.familyId) saveOrder(session.familyId, 'concepts', moveItem(sheets, id, step));
	}

	/** Sheet whose deletion is being confirmed (modal). */
	let sheetToDelete = $state<WithId<ConceptRecord> | null>(null);

	async function removeChapter(familyId: string, chapter: WithId<Chapter>) {
		await deleteChapter(familyId, chapter.id);
		await goto(resolve('/parent/subjects/[id]', { id: chapter.subjectId }), { replace: true });
	}

	// Add a sheet (prompt + JSON).
	let request = $state('');
	let json = $state('');
	let result = $state<ImportPlan | null>(null);

	const prompt = $derived.by(() => {
		const chapter = chapterLive.data;
		const subject = subjectLive.data;
		if (!chapter || !subject) return '';
		return sheetPrompt({
			subject: subject.name,
			grade: subject.grade,
			chapter: chapter.title,
			group: chapter.group,
			request,
			existingTitles: activeOnly(sheetsLive.data ?? []).map((s) => s.title),
			usedIds: (subjectSheetsLive.data ?? []).map((s) => s.id)
		});
	});

	async function runImport(chapter: WithId<Chapter>, sheet: SheetImport) {
		if (!session.familyId) return;
		result = await importSheets(session.familyId, chapter, [sheet]);
		json = '';
		request = '';
	}
</script>

<svelte:head>
	{#if chapterLive.data}<title>{chapterLive.data.title} · {fr.app.name}</title>{/if}
</svelte:head>

<main>
	{#if session.familyId}
		{@const familyId = session.familyId}
		<LoadState
			source={chapterLive}
			notFound={fr.binder.chapterNotFound}
			failed={fr.binder.loadFailed}
		>
			{#snippet children(chapter)}
				<BackLink
					href={resolve('/parent/subjects/[id]', { id: chapter.subjectId })}
					label={subjectLive.data?.name ?? fr.binder.subject}
				/>
				<header class="flex flex-wrap items-center gap-3">
					<div class="flex flex-1 flex-col">
						{#if chapter.group}
							<span class="text-sm text-base-content/70">{chapter.group}</span>
						{/if}
						<h1>{chapter.title}</h1>
					</div>
					{#if chapter.archived}<span class="badge badge-ghost">{t.hidden}</span>{/if}
				</header>
				<div class="flex flex-wrap gap-2">
					<a class="btn btn-sm" href={resolve('/chapter/[id]', { id: chapter.id })}>{t.view}</a>
					<button
						class="btn btn-ghost btn-sm"
						onclick={() => setArchived(familyId, 'chapters', chapter.id, !chapter.archived)}
					>
						{chapter.archived ? t.show : t.hide}
					</button>
				</div>

				<section class="card card-border bg-base-100">
					<div class="card-body gap-3">
						<h2 class="card-title">{t.sheets}</h2>
						<LoadState source={sheetsLive} failed={fr.binder.loadFailed}>
							{#snippet children(sheets)}
								<ul class="flex flex-col divide-y divide-base-300">
									{#each sheets as sheet, i (sheet.id)}
										<li
											class="flex flex-wrap items-center gap-x-3 gap-y-1 py-2"
											in:row
											out:row={{ exit: true }}
											animate:reorder
										>
											<span
												class={[
													'flex min-w-0 flex-1 basis-48 flex-col',
													sheet.archived && 'text-base-content/50'
												]}
											>
												{#if sheet.archived}
													<strong>{@html renderInline(sheet.title)}</strong>
												{:else}
													<a
														class="font-bold hover:underline"
														href={resolve('/concept/[id]', { id: sheet.id })}
													>
														{@html renderInline(sheet.title)}
													</a>
												{/if}
												<span class="font-mono text-xs text-base-content/60">
													{sheet.id} · v{sheet.version}
												</span>
											</span>
											{#if sheet.archived}
												<span class="badge badge-ghost badge-sm">{t.hidden}</span>
											{/if}
											<OrderActions
												first={i === 0}
												last={i === sheets.length - 1}
												archived={sheet.archived}
												onmove={(step) => move(sheets, sheet.id, step)}
												onarchive={(archived) =>
													setArchived(familyId, 'concepts', sheet.id, archived)}
												ondelete={() => (sheetToDelete = sheet)}
											/>
										</li>
									{:else}
										<li class="py-2 text-base-content/70">{fr.binder.noSheets}</li>
									{/each}
								</ul>
								{#if sheetToDelete}
									{@const sheet = sheetToDelete}
									<ConfirmDeleteDialog
										title={t.deleteNamed(sheet.title)}
										help={t.deleteSheetHelp}
										action={t.delete}
										onconfirm={() => deleteSheet(familyId, sheet.id)}
										onclose={() => (sheetToDelete = null)}
									/>
								{/if}
							{/snippet}
						</LoadState>
					</div>
				</section>

				<section class="card card-border bg-base-100">
					<div class="card-body gap-3">
						<h2 class="card-title">{ti.addSheet}</h2>
						<p class="text-sm text-base-content/70">{ti.addSheetHelp}</p>
						<label class="fieldset">
							<span class="fieldset-legend">{ti.request}</span>
							<input
								class="input w-full"
								bind:value={request}
								placeholder={ti.requestPlaceholder}
							/>
						</label>
						{#if prompt}<PromptCopy {prompt} />{/if}
						<JsonPaste schema={sheetSchema} bind:value={json} placeholder={ti.sheetPlaceholder}>
							{#snippet children(sheet)}
								<ImportPreview
									{familyId}
									sheets={[sheet]}
									chapterId={chapter.id}
									submitLabel={ti.submitSheet}
									onimport={() => runImport(chapter, sheet)}
								/>
							{/snippet}
						</JsonPaste>
						{#if result}<ImportResult plan={result} />{/if}
					</div>
				</section>

				{#key chapter.id}
					<ChapterSettings {familyId} {chapter} groups={groupNames(siblingsLive.data ?? [])} />
					<ExportButton
						label={fr.export.chapter}
						fileName={exportFileName('chapitre', chapter.title)}
						load={() => exportChapter(familyId, chapter.id)}
					/>
				{/key}
				<ConfirmDelete
					title={t.deleteChapterTitle}
					help={t.deleteChapterHelp(sheetsLive.data?.length ?? 0)}
					action={t.delete}
					onconfirm={() => removeChapter(familyId, chapter)}
				/>
			{/snippet}
		</LoadState>
	{/if}
</main>
