<script lang="ts">
	import { UI_ICONS } from '#lib/binder/icons.ts';
	import Icon from '#lib/components/Icon.svelte';
	import ImportPreview from '#lib/components/ImportPreview.svelte';
	import ImportResult from '#lib/components/ImportResult.svelte';
	import JsonPaste from '#lib/components/JsonPaste.svelte';
	import { importBackup } from '#lib/data/importSheets.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import type { ImportPlan } from '#lib/import/sheetPlan.ts';
	import {
		backupSchema,
		FAMILY_FORMAT,
		subjectsOf,
		type BackupImport
	} from '#lib/schemas/subject.ts';

	/**
	 * Parent: restore a `subject@1` / `binder@1` file exported by the app, as new subjects.
	 * The file can be chosen or pasted; the usual preview checks sheet id conflicts.
	 */
	let { familyId }: { familyId: string } = $props();

	const t = fr.export;
	let json = $state('');
	let result = $state<{ subjectIds: string[]; plan: ImportPlan } | null>(null);

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
		<JsonPaste
			schema={backupSchema}
			bind:value={json}
			placeholder={t.placeholder}
			label={t.pasteLabel}
		>
			{#snippet children(backup)}
				{@const subjects = subjectsOf(backup)}
				{@const chapters = subjects.flatMap((s) => s.chapters)}
				{#if backup.format === FAMILY_FORMAT}
					<p class="alert alert-info alert-soft">{t.familyArchive(backup.profiles.length)}</p>
				{/if}
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
