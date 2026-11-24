<script lang="ts">
	import { SUBJECT_SWATCH } from '#lib/binder/colors.ts';
	import { updateSubject } from '#lib/data/catalogEdit.ts';
	import { SUBJECT_COLORS, type Subject, type SubjectColor, type WithId } from '#lib/data/types.ts';
	import { fr } from '#lib/i18n/fr.ts';

	/** Parent: rename a subject and change its colour. */
	let { familyId, subject }: { familyId: string; subject: WithId<Subject> } = $props();

	const t = fr.manage;
	// Form state starts from the stored values (the form is keyed on the subject id).
	// svelte-ignore state_referenced_locally
	let name = $state(subject.name);
	// svelte-ignore state_referenced_locally
	let color = $state<SubjectColor>(subject.color);
	let saved = $state(false);

	function save(event: SubmitEvent) {
		event.preventDefault();
		if (!name.trim()) return;
		updateSubject(familyId, subject.id, { name: name.trim(), color });
		saved = true;
	}
</script>

<form class="card card-border bg-base-100" onsubmit={save} oninput={() => (saved = false)}>
	<div class="card-body gap-3">
		<h2 class="card-title">{t.subjectSettings}</h2>
		<label class="fieldset">
			<span class="fieldset-legend">{t.subjectName}</span>
			<input class="input w-full" bind:value={name} maxlength="40" required />
		</label>
		<fieldset class="fieldset">
			<legend class="fieldset-legend">{t.color}</legend>
			<div class="flex flex-wrap gap-2">
				{#each SUBJECT_COLORS as c (c)}
					<label class="cursor-pointer" title={t.colors[c]}>
						<input
							class="peer sr-only"
							type="radio"
							name="color"
							value={c}
							bind:group={color}
							onchange={() => (saved = false)}
						/>
						<span
							class={[
								'block size-8 rounded-full ring-offset-2 ring-offset-base-100 peer-checked:ring-2 peer-checked:ring-base-content peer-focus-visible:ring-2',
								SUBJECT_SWATCH[c]
							]}
						></span>
						<span class="sr-only">{t.colors[c]}</span>
					</label>
				{/each}
			</div>
		</fieldset>
		<div class="flex items-center gap-3">
			<button class="btn btn-primary" type="submit">{fr.common.save}</button>
			{#if saved}<span class="text-sm text-success" aria-live="polite">{t.saved}</span>{/if}
		</div>
	</div>
</form>
