<script lang="ts">
	import { UI_ICONS } from '#lib/binder/icons.ts';
	import Icon from '#lib/components/Icon.svelte';
	import ImportPreview from '#lib/components/ImportPreview.svelte';
	import ImportResult from '#lib/components/ImportResult.svelte';
	import JsonPaste from '#lib/components/JsonPaste.svelte';
	import { importBackup } from '#lib/data/importSheets.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import type { ImportPlan } from '#lib/import/sheetPlan.ts';
	import { backupSchema, subjectsOf, type BackupImport } from '#lib/schemas/subject.ts';

	/**
	 * Parent: restore a `subject@1` / `binder@1` file exported by the app, as new subjects.
	 * The file can be chosen or pasted; the usual preview checks sheet id conflicts.
	 */
	let { familyId }: { familyId: string } = $props();

	const t = fr.export;
	let json = $state('');
	let fileFailed = $state(false);
	let result = $state<{ subjectIds: string[]; plan: ImportPlan } | null>(null);

	async function pick(event: Event) {
		const file = (event.currentTarget as HTMLInputElement).files?.[0];
		fileFailed = false;
		if (!file) return;
		try {
			json = await file.text();
			result = null;
		} catch (error) {
			console.error('[restore] file', error);
			fileFailed = true;
		}
	}

	async function restore(backup: BackupImport) {
		result = await importBackup(familyId, backup);
		json = '';
	}
</script>

<section class="card card-border bg-base-100">
	<div class="card-body gap-3">
		<h2 class="card-title">
			<Icon paths={UI_ICONS.upload} class="size-5 text-primary" />
			{t.restoreTitle}
		</h2>
		<p class="text-sm text-base-content/70">{t.restoreHelp}</p>
		<label class="btn btn-soft btn-primary btn-sm self-start">
			<Icon paths={UI_ICONS.upload} class="size-4" />
			{t.chooseFile}
			<input class="hidden" type="file" accept="application/json,.json" onchange={pick} />
		</label>
		{#if fileFailed}<p role="alert" class="alert alert-error alert-soft">{t.fileFailed}</p>{/if}
		<JsonPaste
			schema={backupSchema}
			bind:value={json}
			placeholder={t.placeholder}
			label={t.pasteLabel}
		>
			{#snippet children(backup)}
				{@const subjects = subjectsOf(backup)}
				{@const chapters = subjects.flatMap((s) => s.chapters)}
				<p class="font-bold">
					{t.summary(subjects.length, chapters.length, chapters.flatMap((c) => c.sheets).length)}
				</p>
				<ul class="flex flex-wrap gap-1.5">
					{#each subjects as subject, i (i)}
						<li class="badge badge-outline">{subject.name} · {subject.grade}</li>
					{/each}
				</ul>
				<ImportPreview
					{familyId}
					sheets={chapters.flatMap((c) => c.sheets)}
					chapterId={null}
					submitLabel={t.submit}
					onimport={() => restore(backup)}
				/>
			{/snippet}
		</JsonPaste>
		{#if result}
			<ImportResult plan={result.plan}>
				<p>{t.done(result.subjectIds.length)}</p>
			</ImportResult>
		{/if}
	</div>
</section>
