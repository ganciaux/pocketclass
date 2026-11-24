<script lang="ts">
	import { session } from '#lib/auth.svelte.ts';
	import { UI_ICONS } from '#lib/binder/icons.ts';
	import Icon from '#lib/components/Icon.svelte';
	import NoteForm from '#lib/components/NoteForm.svelte';
	import { watchChapter, watchSubject } from '#lib/data/catalog.ts';
	import { live } from '#lib/data/live.svelte.ts';
	import type { NoteTarget } from '#lib/data/notes.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { noteContext } from '#lib/notes/notes.ts';
	import { page } from '$app/state';

	/**
	 * « Une difficulté ? » on every child page (a child, or a parent testing as one): a note
	 * about the page's chapter or subject, or a free note. Hidden on a sheet (its own form).
	 */
	const t = fr.notes;
	const familyId = $derived(session.familyId);
	const ownerId = $derived(session.childView?.ownerId ?? null);
	const context = $derived(ownerId ? noteContext(page.route.id, page.params) : null);

	// Primitives for the sources: the chapter / subject named in the dialog.
	const chapterId = $derived(context?.kind === 'chapter' ? context.id : null);
	const subjectId = $derived(context?.kind === 'subject' ? context.id : null);
	const chapterLive = live(() => familyId && chapterId && watchChapter(familyId, chapterId));
	const subjectLive = live(() => familyId && subjectId && watchSubject(familyId, subjectId));

	const target = $derived<NoteTarget>(chapterId ? { chapterId } : subjectId ? { subjectId } : {});
	const about = $derived(
		chapterId
			? chapterLive.data && t.about.chapter(chapterLive.data.title)
			: subjectId
				? subjectLive.data && t.about.subject(subjectLive.data.name)
				: t.about.free
	);

	let dialog = $state<HTMLDialogElement>();
	let open = $state(false);

	function show() {
		open = true;
		dialog?.showModal();
	}
</script>

{#if context && familyId && ownerId}
	<!-- Room under the last control of the page, so the button never covers it. -->
	<div class="h-20" aria-hidden="true"></div>
	<button
		class="btn fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-10 gap-2 rounded-full shadow-lg btn-lg btn-secondary max-sm:btn-circle"
		title={t.formTitle}
		onclick={show}
	>
		<Icon paths={UI_ICONS.message} class="size-6" />
		<span class="max-sm:sr-only">{t.formTitle}</span>
	</button>

	<dialog
		bind:this={dialog}
		class="modal modal-bottom sm:modal-middle"
		onclose={() => (open = false)}
	>
		<div class="modal-box flex flex-col gap-3">
			<h2 class="text-lg font-bold">{t.formTitle}</h2>
			{#if about}<p class="text-sm text-base-content/70">{about}</p>{/if}
			<!-- Mounted while open: a fresh form (no « enregistrée » left over) each time. -->
			{#if open}
				<NoteForm {familyId} profileId={ownerId} {target} />
			{/if}
			<form method="dialog" class="modal-action mt-0">
				<button class="btn btn-ghost">{t.close}</button>
			</form>
		</div>
		<form method="dialog" class="modal-backdrop"><button>{t.close}</button></form>
	</dialog>
{/if}
