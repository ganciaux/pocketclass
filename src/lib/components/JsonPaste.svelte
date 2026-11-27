<script lang="ts" generics="T extends { warnings?: string[] }">
	import type { Snippet } from 'svelte';
	import type { z } from 'zod';
	import { UI_ICONS } from '#lib/binder/icons.ts';
	import CopyButton from '#lib/components/CopyButton.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { fr } from '#lib/i18n/fr.ts';
	import { parseJsonLoose } from '#lib/import/parseJsonLoose.ts';
	import { fixPrompt } from '#lib/prompts/sheetPrompt.ts';
	import { validate } from '#lib/schemas/errors.ts';

	/**
	 * Paste area for the AI's JSON, or a chosen `.json` file (its text fills the area): parsed
	 * and validated on every change (French errors with the field path). `children` renders the
	 * valid document (preview, import button).
	 */
	let {
		schema,
		value = $bindable(''),
		placeholder,
		label = fr.import.paste,
		fromAi = true,
		children
	}: {
		schema: z.ZodType<T>;
		value?: string;
		placeholder: string;
		/** Field label (default: the AI's answer). */
		label?: string;
		/** The JSON comes from the AI (offers to copy its errors back to it); false for a backup. */
		fromAi?: boolean;
		children: Snippet<[T]>;
	} = $props();

	const t = fr.import;
	let fileFailed = $state(false);

	async function pick(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		fileFailed = false;
		if (!file) return;
		try {
			value = await file.text();
		} catch (error) {
			console.error('[import] file', error);
			fileFailed = true;
		}
	}

	const parsed = $derived.by(() => {
		if (!value.trim()) return null;
		const json = parseJsonLoose(value);
		if (!json.ok) return { success: false as const, errors: [json.error] };
		return validate(schema, json.value);
	});
</script>

<label
	class="btn btn-soft btn-primary btn-sm self-start focus-within:outline-2 focus-within:outline-offset-2"
>
	<Icon paths={UI_ICONS.upload} class="size-4" />
	{t.chooseFile}
	<input class="sr-only" type="file" accept="application/json,.json,.txt" onchange={pick} />
</label>
{#if fileFailed}<p role="alert" class="alert alert-error alert-soft">{t.fileFailed}</p>{/if}

<label class="fieldset">
	<span class="fieldset-legend">{label}</span>
	<textarea
		class="textarea w-full resize-y font-mono text-sm"
		rows="6"
		spellcheck="false"
		{placeholder}
		bind:value></textarea>
</label>

{#if parsed && !parsed.success}
	<section
		role="alert"
		class="alert alert-error alert-soft flex-col items-start"
		aria-live="polite"
	>
		<strong>{t.errorsTitle}</strong>
		<ul class="list-disc space-y-1 pl-5 font-mono text-sm">
			{#each parsed.errors as error, i (i)}<li>{error}</li>{/each}
		</ul>
	</section>
	{#if fromAi}
		<!-- The AI fixes its own JSON: paste this back into the same conversation. -->
		<div class="flex flex-col gap-1">
			<CopyButton text={fixPrompt(parsed.errors)} label={t.copyFix} />
			<p class="text-sm text-base-content/60">{t.copyFixHelp}</p>
		</div>
	{/if}
{:else if parsed?.success}
	{#if parsed.data.warnings?.length}
		<div class="alert alert-warning alert-soft flex-col items-start">
			<strong>{t.warningsTitle}</strong>
			<ul class="list-disc space-y-1 pl-5">
				{#each parsed.data.warnings as warning, i (i)}<li>{warning}</li>{/each}
			</ul>
		</div>
	{/if}
	{@render children(parsed.data)}
{/if}
