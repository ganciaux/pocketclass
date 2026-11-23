<script lang="ts">
	import { addNote, type NoteTarget } from '#lib/data/notes.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { NOTE_MAX } from '#lib/notes/notes.ts';

	/** Child: "what I found difficult" about a sheet (or, in phase 2, an exercise). */
	let { familyId, profileId, target }: { familyId: string; profileId: string; target: NoteTarget } =
		$props();

	const t = fr.notes;
	let text = $state('');
	let added = $state(false);

	function submit(event: SubmitEvent) {
		event.preventDefault();
		const value = text.trim();
		if (!value) return;
		addNote(familyId, profileId, target, value); // offline-friendly, shows at once
		text = '';
		added = true;
	}
</script>

<form class="flex flex-col gap-2" onsubmit={submit}>
	<label class="fieldset">
		<span class="text-sm">{t.formHelp}</span>
		<textarea
			class="textarea w-full"
			bind:value={text}
			oninput={() => (added = false)}
			rows="3"
			maxlength={NOTE_MAX}
			placeholder={t.placeholder}></textarea>
	</label>
	{#if added}<p class="text-sm text-success" aria-live="polite">{t.added}</p>{/if}
	<button class="btn btn-secondary self-start" type="submit" disabled={!text.trim()}>
		{t.add}
	</button>
</form>
