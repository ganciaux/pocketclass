<script lang="ts">
	import { fr } from '#lib/i18n/fr.ts';

	/**
	 * Title + optional group of a chapter (new chapter, chapter settings, chapter import).
	 * `groups`: names already used in the subject, offered as suggestions.
	 */
	let {
		title = $bindable(''),
		group = $bindable(''),
		groups,
		id
	}: { title?: string; group?: string; groups: string[]; id: string } = $props();

	const t = fr.manage;
</script>

<div class="grid gap-3 sm:grid-cols-2">
	<label class="fieldset">
		<span class="fieldset-legend">{t.chapterTitle}</span>
		<input
			class="input w-full"
			bind:value={title}
			placeholder={t.chapterPlaceholder}
			maxlength="80"
		/>
	</label>
	<label class="fieldset">
		<span class="fieldset-legend">{t.group}</span>
		<input class="input w-full" bind:value={group} list={`${id}-groups`} maxlength="40" />
		<datalist id={`${id}-groups`}>
			{#each groups as name (name)}<option value={name}></option>{/each}
		</datalist>
		<span class="label whitespace-normal">{t.groupHelp}</span>
	</label>
</div>
