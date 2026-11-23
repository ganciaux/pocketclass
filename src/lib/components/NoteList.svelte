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

	function review(noteId: string, status: NoteStatus) {
		setNoteStatus(familyId, profileId, noteId, status);
	}
</script>

<ul class="flex flex-col gap-2">
	{#each notes as note (note.id)}
		<li class="card card-border card-sm bg-base-100">
			<div class="card-body gap-2">
				<header class="flex items-center justify-between gap-2">
					<span
						class="badge badge-sm"
						class:badge-warning={note.status === 'open'}
						class:badge-info={note.status === 'seen'}
						class:badge-success={note.status === 'resolved'}
					>
						{t.status[note.status]}
					</span>
					{#if note.createdAt}
						<span class="text-sm text-base-content/60">
							{t.on(formatDate(note.createdAt.toDate()))}
						</span>
					{/if}
				</header>
				{#if titles}
					{@const title = titles.get(note.conceptId)}
					{#if title}
						<a
							class="font-bold hover:underline"
							href={resolve('/concept/[id]', { id: note.conceptId })}
						>
							{@html renderInline(title)}
						</a>
					{:else}
						<span class="text-sm text-base-content/60">{t.archivedConcept}</span>
					{/if}
				{/if}

				{#if editingId === note.id}
					<form class="flex flex-col gap-2" onsubmit={(e) => saveEdit(e, note.id)}>
						<textarea class="textarea w-full" bind:value={draft} rows="3" maxlength={NOTE_MAX}
						></textarea>
						<div class="flex gap-2">
							<button class="btn btn-primary btn-sm" type="submit">{fr.common.save}</button>
							<button class="btn btn-ghost btn-sm" type="button" onclick={() => (editingId = null)}>
								{fr.common.cancel}
							</button>
						</div>
					</form>
				{:else}
					<p class={['whitespace-pre-wrap', note.status === 'resolved' && 'text-base-content/60']}>
						{note.text}
					</p>
					<div class="flex flex-wrap gap-1">
						{#if mode === 'child'}
							<button class="btn btn-ghost btn-xs" onclick={() => startEdit(note)}>{t.edit}</button>
							<button class="btn btn-ghost btn-xs" onclick={() => remove(note.id)}>
								{t.delete}
							</button>
						{:else}
							{#each reviewActions(note.status) as status (status)}
								<button class="btn btn-outline btn-xs" onclick={() => review(note.id, status)}>
									{t.review[status]}
								</button>
							{/each}
						{/if}
					</div>
				{/if}
			</div>
		</li>
	{:else}
		<li class="text-base-content/70">{t.empty}</li>
	{/each}
</ul>
