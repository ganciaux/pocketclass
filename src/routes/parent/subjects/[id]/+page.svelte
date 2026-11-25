<script lang="ts">
	import { UI_ICONS } from '#lib/binder/icons.ts';
	import Icon from '#lib/components/Icon.svelte';
	import ExportButton from '#lib/components/ExportButton.svelte';
	import { exportSubject } from '#lib/data/catalogExport.ts';
	import { exportFileName } from '#lib/import/catalogExport.ts';
	import SubjectBadge from '#lib/components/SubjectBadge.svelte';
	import BackLink from '#lib/components/BackLink.svelte';
	import { session } from '#lib/auth.svelte.ts';
	import { groupNames, moveItem, nextOrder } from '#lib/binder/binder.ts';
	import ChapterForm from '#lib/components/ChapterForm.svelte';
	import ConfirmDelete from '#lib/components/ConfirmDelete.svelte';
	import ConfirmDeleteDialog from '#lib/components/ConfirmDeleteDialog.svelte';
	import ImportPreview from '#lib/components/ImportPreview.svelte';
	import ImportResult from '#lib/components/ImportResult.svelte';
	import JsonPaste from '#lib/components/JsonPaste.svelte';
	import LoadState from '#lib/components/LoadState.svelte';
	import OrderActions from '#lib/components/OrderActions.svelte';
	import PromptCopy from '#lib/components/PromptCopy.svelte';
	import SubjectForm from '#lib/components/SubjectForm.svelte';
	import { watchChaptersOf, watchSheetsOfSubject, watchSubject } from '#lib/data/catalog.ts';
	import { deleteChapter, deleteSubject } from '#lib/data/catalogDelete.ts';
	import { createChapter, saveOrder, setArchived } from '#lib/data/catalogEdit.ts';
	import { importChapter } from '#lib/data/importSheets.ts';
	import { live } from '#lib/data/live.svelte.ts';
	import { GRADES, type Chapter, type Subject, type WithId } from '#lib/data/types.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { reorder, row } from '#lib/motion.ts';
	import type { ImportPlan } from '#lib/import/sheetPlan.ts';
	import { chapterPrompt } from '#lib/prompts/sheetPrompt.ts';
	import { chapterSchema, type ChapterImport } from '#lib/schemas/chapter.ts';
	import { goto } from '$app/navigation';
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

	// Deletions.
	let chapterToDelete = $state<WithId<Chapter> | null>(null);
	const sheetCount = (chapterId: string) =>
		(sheetsLive.data ?? []).filter((s) => s.chapterId === chapterId).length;

	async function removeSubject(familyId: string) {
		await deleteSubject(familyId, subjectId);
		await goto(resolve('/parent/subjects'), { replace: true });
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

<svelte:head>
	{#if subjectLive.data}<title>{subjectLive.data.name} · {fr.app.name}</title>{/if}
</svelte:head>

<main>
	<BackLink href={resolve('/parent/subjects')} label={t.back} />
	{#if session.familyId}
		{@const familyId = session.familyId}
		<LoadState
			source={subjectLive}
			notFound={fr.binder.subjectNotFound}
			failed={fr.binder.loadFailed}
		>
			{#snippet children(subject)}
				<header class="flex flex-wrap items-center gap-3">
					<a
						class="link-icon"
						href={resolve('/subject/[id]', { id: subject.id })}
						title={t.view}
						aria-label={t.view}
					>
						<SubjectBadge {subject} />
					</a>
					<h1 class="flex-1">{subject.name}</h1>
					<span class="badge badge-ghost">{subject.grade}</span>
					{#if subject.archived}<span class="badge badge-ghost">{t.hidden}</span>{/if}
				</header>
				<div class="flex flex-wrap gap-2">
					<a
						class="btn btn-soft btn-primary btn-sm"
						href={resolve('/subject/[id]', { id: subject.id })}
					>
						{t.view}
					</a>
					<button
						class="btn btn-ghost btn-sm"
						onclick={() => setArchived(familyId, 'subjects', subject.id, !subject.archived)}
					>
						<Icon paths={subject.archived ? UI_ICONS.eyeOff : UI_ICONS.eye} class="size-4" />
						{subject.archived ? t.show : t.hide}
					</button>
				</div>

				<section class="card card-border bg-base-100">
					<div class="card-body gap-3">
						<h2 class="card-title">{t.chapters}</h2>
						<LoadState source={chaptersLive} failed={fr.binder.loadFailed}>
							{#snippet children(chapters)}
								<ul class="flex flex-col gap-1">
									{#each chapters as chapter, i (chapter.id)}
										<li
											class="link-row relative -mx-2 flex flex-wrap items-center gap-x-3 gap-y-1 px-2 py-2"
											in:row
											out:row={{ exit: true }}
											animate:reorder
										>
											<a
												class={[
													'flex min-w-0 flex-1 basis-48 flex-col after:absolute after:inset-0',
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
												ondelete={() => (chapterToDelete = chapter)}
											/>
										</li>
									{:else}
										<li class="py-2 text-base-content/70">{fr.binder.noChapters}</li>
									{/each}
								</ul>
								{#if chapterToDelete}
									{@const chapter = chapterToDelete}
									<ConfirmDeleteDialog
										title={t.deleteNamed(chapter.title)}
										help={t.deleteChapterHelp(sheetCount(chapter.id))}
										action={t.delete}
										onconfirm={() => deleteChapter(familyId, chapter.id)}
										onclose={() => (chapterToDelete = null)}
									/>
								{/if}

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

				<!-- A subject left by the old path import has no grade: no prompt, only deletion. -->
				{#if GRADES.includes(subject.grade)}
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
							<JsonPaste
								schema={chapterSchema}
								bind:value={json}
								placeholder={ti.chapterPlaceholder}
							>
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
										class="btn btn-soft btn-primary btn-sm"
										href={resolve('/parent/chapters/[id]', { id: result.chapterId })}
									>
										{ti.openChapter}
									</a>
								</ImportResult>
							{/if}
						</div>
					</section>
				{/if}

				{#key subject.id}<SubjectForm {familyId} {subject} />{/key}
				<ExportButton
					label={fr.export.subject}
					fileName={exportFileName('matiere', `${subject.name} ${subject.grade}`)}
					load={() => exportSubject(familyId, subject.id)}
				/>
				<ConfirmDelete
					title={t.deleteSubjectTitle}
					help={t.deleteSubjectHelp(chaptersLive.data?.length ?? 0, sheetsLive.data?.length ?? 0)}
					action={t.delete}
					onconfirm={() => removeSubject(familyId)}
				/>
			{/snippet}
		</LoadState>
	{/if}
</main>
