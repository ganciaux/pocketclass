<script lang="ts">
	import ChapterForm from '#lib/components/ChapterForm.svelte';
	import { updateChapter } from '#lib/data/catalogEdit.ts';
	import type { Chapter, WithId } from '#lib/data/types.ts';
	import { fr } from '#lib/i18n/fr.ts';

	/** Parent: rename a chapter or change its group. `groups`: suggestions. */
	let {
		familyId,
		chapter,
		groups
	}: { familyId: string; chapter: WithId<Chapter>; groups: string[] } = $props();

	const t = fr.manage;
	// Form state starts from the stored values (mount it in a {#key chapter.id}).
	// svelte-ignore state_referenced_locally
	let title = $state(chapter.title);
	// svelte-ignore state_referenced_locally
	let group = $state(chapter.group ?? '');
	let saved = $state(false);

	function save(event: SubmitEvent) {
		event.preventDefault();
		if (!title.trim()) return;
		updateChapter(familyId, chapter.id, { title: title.trim(), group: group.trim() || null });
		saved = true;
	}
</script>

<form class="card card-border bg-base-100" onsubmit={save} oninput={() => (saved = false)}>
	<div class="card-body gap-3">
		<h2 class="card-title">{t.chapterSettings}</h2>
		<ChapterForm id="chapter-settings" bind:title bind:group {groups} />
		<div class="flex items-center gap-3">
			<button class="btn btn-primary" type="submit">{fr.common.save}</button>
			{#if saved}<span class="text-sm text-success" aria-live="polite">{t.saved}</span>{/if}
		</div>
	</div>
</form>
