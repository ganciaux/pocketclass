<script lang="ts">
	import { SUBJECT_SWATCH } from '#lib/binder/colors.ts';
	import { ICON_PATHS, subjectIcon } from '#lib/binder/icons.ts';
	import Icon from '#lib/components/Icon.svelte';
	import SubjectBadge from '#lib/components/SubjectBadge.svelte';
	import { updateSubject } from '#lib/data/catalogEdit.ts';
	import {
		SUBJECT_COLORS,
		SUBJECT_ICONS,
		type Subject,
		type SubjectColor,
		type SubjectIcon,
		type WithId
	} from '#lib/data/types.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { AvatarTooLargeError, imageFileToAvatar } from '#lib/profile/avatar.ts';

	/** Parent: name, colour, icon and optional image (picture or logo) of a subject. */
	let { familyId, subject }: { familyId: string; subject: WithId<Subject> } = $props();

	const t = fr.manage;
	// Form state starts from the stored values (the form is keyed on the subject id).
	// svelte-ignore state_referenced_locally
	let name = $state(subject.name);
	// svelte-ignore state_referenced_locally
	let color = $state<SubjectColor>(subject.color);
	// svelte-ignore state_referenced_locally
	let icon = $state<SubjectIcon>(subjectIcon(subject));
	// svelte-ignore state_referenced_locally
	let image = $state<string | null>(subject.image ?? null);
	let imageError = $state<string | null>(null);
	let saved = $state(false);

	async function pickImage(event: Event & { currentTarget: HTMLInputElement }) {
		const file = event.currentTarget.files?.[0];
		event.currentTarget.value = '';
		if (!file) return;
		imageError = null;
		saved = false;
		try {
			image = await imageFileToAvatar(file);
		} catch (error) {
			console.error('[subject] image', error);
			imageError =
				error instanceof AvatarTooLargeError ? fr.look.imageTooLarge : fr.look.imageFailed;
		}
	}

	function save(event: SubmitEvent) {
		event.preventDefault();
		if (!name.trim()) return;
		updateSubject(familyId, subject.id, { name: name.trim(), color, icon, image });
		saved = true;
	}
</script>

<form class="card card-border bg-base-100" onsubmit={save} oninput={() => (saved = false)}>
	<div class="card-body gap-3">
		<h2 class="card-title">{t.subjectSettings}</h2>
		<div class="flex items-center gap-4">
			<SubjectBadge subject={{ name, color, icon, image: image ?? undefined }} size={4} />
			<label class="fieldset min-w-0 flex-1">
				<span class="fieldset-legend">{t.subjectName}</span>
				<input class="input w-full" bind:value={name} maxlength="40" required />
			</label>
		</div>

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

		<fieldset class="fieldset">
			<legend class="fieldset-legend">{t.icon}</legend>
			{#if image}<p class="text-sm text-base-content/70">{t.iconHidden}</p>{/if}
			<div class="flex flex-wrap gap-1">
				{#each SUBJECT_ICONS as i (i)}
					<label class="cursor-pointer" title={t.icons[i]}>
						<input
							class="peer sr-only"
							type="radio"
							name="icon"
							value={i}
							bind:group={icon}
							onchange={() => (saved = false)}
						/>
						<span
							class="grid size-11 place-items-center rounded-box text-base-content/70 peer-checked:bg-base-200 peer-checked:text-base-content peer-checked:ring-2 peer-checked:ring-base-content peer-focus-visible:ring-2"
						>
							<Icon paths={ICON_PATHS[i]} class="size-6" />
						</span>
						<span class="sr-only">{t.icons[i]}</span>
					</label>
				{/each}
			</div>
		</fieldset>

		<div class="flex flex-col items-start gap-1">
			<label class="fieldset">
				<span class="fieldset-legend">{t.image}</span>
				<input class="file-input file-input-sm" type="file" accept="image/*" onchange={pickImage} />
				<span class="label whitespace-normal">{t.imageHelp}</span>
			</label>
			{#if image}
				<button
					type="button"
					class="btn btn-ghost btn-xs"
					onclick={() => ((image = null), (saved = false))}
				>
					{fr.look.removeImage}
				</button>
			{/if}
			{#if imageError}<p role="alert" class="text-sm text-error">{imageError}</p>{/if}
		</div>

		<div class="flex items-center gap-3">
			<button class="btn btn-primary" type="submit">{fr.common.save}</button>
			{#if saved}<span class="text-sm text-success" aria-live="polite">{t.saved}</span>{/if}
		</div>
	</div>
</form>
