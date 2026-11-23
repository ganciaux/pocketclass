<script lang="ts">
	import { deleteNote, setNoteStatus, updateNoteText } from '#lib/data/notes.ts';
	import type { Note, NoteStatus, WithId } from '#lib/data/types.ts';
	import { formatDate, fr } from '#lib/i18n/fr.ts';
	import { NOTE_MAX, reviewActions } from '#lib/notes/notes.ts';
	import { renderInline } from '#lib/render/markdown.ts';
	import { resolve } from '$app/paths';

	/**
	 * Notes of a profile. `child`: edit / delete their own notes. `parent`: set the status.
	 * With `titles` (concept id → title), each note links back to its sheet.
	 */
	let {
		familyId,
		profileId,
		notes,
		mode,
		titles
	}: {
		familyId: string;
		profileId: string;
		notes: WithId<Note>[];
		mode: 'child' | 'parent';
		titles?: ReadonlyMap<string, string>;
	} = $props();

	const t = fr.notes;

	let editingId = $state<string | null>(null);
	let draft = $state('');

	function startEdit(note: WithId<Note>) {
		editingId = note.id;
		draft = note.text;
	}

	function saveEdit(event: SubmitEvent, noteId: string) {
		event.preventDefault();
		const text = draft.trim();
		if (text) updateNoteText(familyId, profileId, noteId, text);
		editingId = null;
	}

	function remove(noteId: string) {
		if (confirm(t.deleteConfirm)) deleteNote(familyId, profileId, noteId);
	}

	const review = (noteId: string, status: NoteStatus) =>
		setNoteStatus(familyId, profileId, noteId, status);
</script>

<ul class="list plain stack-tight">
	{#each notes as note (note.id)}
		<li class="card stack-tight note" class:done={note.status === 'resolved'}>
			<header class="row meta">
				<span class="pill" class:success={note.status === 'resolved'}>{t.status[note.status]}</span>
				{#if note.createdAt}<span class="muted small">
						{t.on(formatDate(note.createdAt.toDate()))}
					</span>{/if}
			</header>
			{#if titles}
				{@const title = titles.get(note.conceptId)}
				{#if title}
					<a href={resolve('/concept/[id]', { id: note.conceptId })}>{@html renderInline(title)}</a>
				{:else}
					<span class="muted small">{t.archivedConcept}</span>
				{/if}
			{/if}

			{#if editingId === note.id}
				<form class="stack-tight" onsubmit={(e) => saveEdit(e, note.id)}>
					<textarea bind:value={draft} rows="3" maxlength={NOTE_MAX}></textarea>
					<div class="row">
						<button class="primary" type="submit">{t.save}</button>
						<button type="button" onclick={() => (editingId = null)}>{t.cancel}</button>
					</div>
				</form>
			{:else}
				<p class="text">{note.text}</p>
				<div class="row">
					{#if mode === 'child'}
						<button class="link" onclick={() => startEdit(note)}>{t.edit}</button>
						<button class="link" onclick={() => remove(note.id)}>{t.delete}</button>
					{:else}
						{#each reviewActions(note.status) as status (status)}
							<button class="link" onclick={() => review(note.id, status)}>
								{t.review[status]}
							</button>
						{/each}
					{/if}
				</div>
			{/if}
		</li>
	{:else}
		<li class="muted">{t.empty}</li>
	{/each}
</ul>

<style>
	.meta {
		justify-content: space-between;
	}

	.text {
		margin: 0;
		white-space: pre-wrap;
	}

	.done .text {
		color: var(--color-muted);
	}
</style>
