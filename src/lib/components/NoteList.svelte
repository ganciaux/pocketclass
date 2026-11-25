<script lang="ts">
	import { UI_ICONS } from '#lib/binder/icons.ts';
	import ConfirmDialog from '#lib/components/ConfirmDialog.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { deleteNote, setNoteStatus, updateNoteText } from '#lib/data/notes.ts';
	import type { Note, NoteStatus, WithId } from '#lib/data/types.ts';
	import { formatDate, fr } from '#lib/i18n/fr.ts';
	import { NOTE_MAX, notePlace, reviewActions, type NoteCatalog } from '#lib/notes/notes.ts';
	import { renderInline } from '#lib/render/markdown.ts';
	import { resolve } from '$app/paths';

	/**
	 * Notes of a profile. `child`: edit / delete their own notes. `parent`: set the status.
	 * With `catalog` (titles by id), each note links back to where it was written.
	 */
	let {
		familyId,
		profileId,
		notes,
		mode,
		catalog
	}: {
		familyId: string;
		profileId: string;
		notes: WithId<Note>[];
		mode: 'child' | 'parent';
		catalog?: NoteCatalog;
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

	/** The note waiting for « Supprimer » to be confirmed in the modal. */
	let deletingId = $state<string | null>(null);

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
				{#if catalog}
					{@const place = notePlace(note, catalog)}
					<!-- Where the note was written: a link back to it, or why there is none. -->
					{#if place.kind === 'sheet'}
						<a class="font-bold hover:underline" href={resolve('/concept/[id]', { id: place.id })}>
							{@html renderInline(place.title)}
						</a>
					{:else if place.kind === 'chapter'}
						<a class="hover:underline" href={resolve('/chapter/[id]', { id: place.id })}>
							<span class="text-sm text-base-content/60">{t.place.chapter}</span>
							<strong>{place.title}</strong>
						</a>
					{:else if place.kind === 'subject'}
						<a class="hover:underline" href={resolve('/subject/[id]', { id: place.id })}>
							<span class="text-sm text-base-content/60">{t.place.subject}</span>
							<strong>{place.title}</strong>
						</a>
					{:else if place.kind === 'free'}
						<span class="text-sm text-base-content/60">{t.place.free}</span>
					{:else}
						<span class="text-sm text-base-content/60">{t.place.gone[place.of]}</span>
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
							<button class="btn btn-ghost btn-sm" onclick={() => startEdit(note)}>
								<Icon paths={UI_ICONS.pencil} class="size-4" />{t.edit}
							</button>
							<button class="btn btn-soft btn-error btn-sm" onclick={() => (deletingId = note.id)}>
								<Icon paths={UI_ICONS.trash} class="size-4" />{t.delete}
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

{#if deletingId}
	{@const noteId = deletingId}
	<ConfirmDialog
		title={t.deleteConfirm}
		message={notes.find((n) => n.id === noteId)?.text}
		confirmLabel={t.delete}
		danger
		onconfirm={() => deleteNote(familyId, profileId, noteId)}
		onclose={() => (deletingId = null)}
	/>
{/if}
