<script lang="ts">
	import { session } from '#lib/auth.svelte.ts';
	import { groupNames, moveItem, nextOrder } from '#lib/binder/binder.ts';
	import ChapterForm from '#lib/components/ChapterForm.svelte';
	import ImportPreview from '#lib/components/ImportPreview.svelte';
	import ImportResult from '#lib/components/ImportResult.svelte';
	import JsonPaste from '#lib/components/JsonPaste.svelte';
	import LoadState from '#lib/components/LoadState.svelte';
	import OrderActions from '#lib/components/OrderActions.svelte';
	import PromptCopy from '#lib/components/PromptCopy.svelte';
	import SubjectForm from '#lib/components/SubjectForm.svelte';
	import { watchChaptersOf, watchSheetsOfSubject, watchSubject } from '#lib/data/catalog.ts';
	import { createChapter, saveOrder, setArchived } from '#lib/data/catalogEdit.ts';
	import { importChapter } from '#lib/data/importSheets.ts';
	import { live } from '#lib/data/live.svelte.ts';
	import type { Chapter, Subject, WithId } from '#lib/data/types.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import type { ImportPlan } from '#lib/import/sheetPlan.ts';
	import { chapterPrompt } from '#lib/prompts/sheetPrompt.ts';
	import { chapterSchema, type ChapterImport } from '#lib/schemas/chapter.ts';
	import { asset, resolve } from '$app/paths';
	import { page } from '$app/state';

	const t = fr.manage;
	const ti = fr.import;
	const subjectId = $derived(page.params.id ?? '');
	const subjectLive = live(
		() => session.familyId && subjectId && watchSubject(session.familyId, subjectId, true)
	);
	const chaptersLive = live(
		() => session.familyId && subjectId && watchChaptersOf(session.familyId, subjectId)
	);
	const sheetsLive = live(
		() => session.familyId && subjectId && watchSheetsOfSubject(session.familyId, subjectId)
	);
	const groups = $derived(groupNames(chaptersLive.data ?? []));

	// New chapter.
	let title = $state('');
	let group = $state('');
	let titleMissing = $state(false);

	function create(event: SubmitEvent, chapters: WithId<Chapter>[]) {
		event.preventDefault();
		titleMissing = !title.trim();
		if (!session.familyId || titleMissing) return;
		createChapter(session.familyId, {
			subjectId,
			title: title.trim(),
			group: group.trim() || null,
			order: nextOrder(chapters)
		});
		title = '';
	}

	function move(chapters: WithId<Chapter>[], id: string, step: -1 | 1) {
		if (session.familyId) saveOrder(session.familyId, 'chapters', moveItem(chapters, id, step));
	}

	// Whole chapter import (prompt + JSON).
	let importTitle = $state('');
	let importGroup = $state('');
	let request = $state('');
	let json = $state('');
	let sampleFailed = $state(false);
	let result = $state<{ plan: ImportPlan; chapterId: string } | null>(null);

	function promptFor(subject: WithId<Subject>) {
		return chapterPrompt({
			subject: subject.name,
			grade: subject.grade,
			chapter: importTitle.trim() || '<titre du chapitre>',
			group: importGroup.trim() || null,
			request,
			existingTitles: [],
			usedIds: (sheetsLive.data ?? []).map((s) => s.id)
		});
	}

	async function loadSample() {
		sampleFailed = false;
		try {
			const response = await fetch(asset('samples/maths-3e-revisions.json'));
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			json = await response.text();
		} catch (error) {
			console.error('[import] sample failed', error);
			sampleFailed = true;
		}
	}

	async function runImport(chapter: ChapterImport) {
		if (!session.familyId) return;
		result = await importChapter(session.familyId, subjectId, chapter);
		json = '';
	}
</script>

<main>
	<a class="link link-hover self-start text-sm" href={resolve('/parent/subjects')}>{t.back}</a>
	{#if session.familyId}
		{@const familyId = session.familyId}
		<LoadState
			source={subjectLive}
			notFound={fr.binder.subjectNotFound}
			failed={fr.binder.loadFailed}
		>
			{#snippet children(subject)}
				<header class="flex flex-wrap items-center gap-3">
					<h1 class="flex-1">{subject.name}</h1>
					<span class="badge badge-ghost">{subject.grade}</span>
					{#if subject.archived}<span class="badge badge-ghost">{t.hidden}</span>{/if}
				</header>
				<div class="flex flex-wrap gap-2">
					<a class="btn btn-sm" href={resolve('/subject/[id]', { id: subject.id })}>{t.view}</a>
					<button
						class="btn btn-ghost btn-sm"
						onclick={() => setArchived(familyId, 'subjects', subject.id, !subject.archived)}
					>
						{subject.archived ? t.show : t.hide}
					</button>
				</div>

				<section class="card card-border bg-base-100">
					<div class="card-body gap-3">
						<h2 class="card-title">{t.chapters}</h2>
						<LoadState source={chaptersLive} failed={fr.binder.loadFailed}>
							{#snippet children(chapters)}
								<ul class="flex flex-col divide-y divide-base-300">
									{#each chapters as chapter, i (chapter.id)}
										<li class="flex items-center gap-3 py-2">
											<a
												class={[
													'flex flex-1 flex-col hover:underline',
													chapter.archived && 'text-base-content/50'
												]}
												href={resolve('/parent/chapters/[id]', { id: chapter.id })}
											>
												{#if chapter.group}
													<span class="text-xs text-base-content/60">{chapter.group}</span>
												{/if}
												<strong>{chapter.title}</strong>
											</a>
											{#if chapter.archived}
												<span class="badge badge-ghost badge-sm">{t.hidden}</span>
											{/if}
											<OrderActions
												first={i === 0}
												last={i === chapters.length - 1}
												archived={chapter.archived}
												onmove={(step) => move(chapters, chapter.id, step)}
												onarchive={(archived) =>
													setArchived(familyId, 'chapters', chapter.id, archived)}
											/>
										</li>
									{:else}
										<li class="py-2 text-base-content/70">{fr.binder.noChapters}</li>
									{/each}
								</ul>

								<form class="flex flex-col gap-3" onsubmit={(e) => create(e, chapters)}>
									<h3 class="font-bold">{t.newChapter}</h3>
									<ChapterForm id="new-chapter" bind:title bind:group {groups} />
									{#if titleMissing}
										<p role="alert" class="text-sm text-error">{t.titleRequired}</p>
									{/if}
									<button class="btn btn-primary self-start" type="submit">{t.create}</button>
								</form>
							{/snippet}
						</LoadState>
					</div>
				</section>

				<section class="card card-border bg-base-100">
					<div class="card-body gap-3">
						<h2 class="card-title">{ti.importChapter}</h2>
						<p class="text-sm text-base-content/70">{ti.importChapterHelp}</p>
						<ChapterForm
							id="import-chapter"
							bind:title={importTitle}
							bind:group={importGroup}
							{groups}
						/>
						<label class="fieldset">
							<span class="fieldset-legend">{ti.chapterRequest}</span>
							<textarea
								class="textarea w-full"
								rows="2"
								bind:value={request}
								placeholder={ti.chapterRequestPlaceholder}></textarea>
						</label>
						<PromptCopy prompt={promptFor(subject)} />
						<JsonPaste schema={chapterSchema} bind:value={json} placeholder={ti.chapterPlaceholder}>
							{#snippet children(chapter)}
								<h3 class="font-bold">
									{chapter.group ? `${chapter.group} · ` : ''}{chapter.title}
								</h3>
								<ImportPreview
									{familyId}
									sheets={chapter.sheets}
									chapterId={null}
									submitLabel={ti.submitChapter}
									onimport={() => runImport(chapter)}
								/>
							{/snippet}
						</JsonPaste>
						<button class="btn btn-ghost btn-sm self-start" onclick={loadSample}>
							{ti.loadSample}
						</button>
						{#if sampleFailed}<p role="alert" class="alert alert-error alert-soft">
								{ti.sampleFailed}
							</p>{/if}
						{#if result}
							<ImportResult plan={result.plan}>
								<a
									class="btn btn-sm"
									href={resolve('/parent/chapters/[id]', { id: result.chapterId })}
								>
									{ti.openChapter}
								</a>
							</ImportResult>
						{/if}
					</div>
				</section>

				{#key subject.id}<SubjectForm {familyId} {subject} />{/key}
			{/snippet}
		</LoadState>
	{/if}
</main>
