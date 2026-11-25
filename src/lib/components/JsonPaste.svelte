<script lang="ts" generics="T extends { warnings?: string[] }">
	import type { Snippet } from 'svelte';
	import type { z } from 'zod';
	import { fr } from '#lib/i18n/fr.ts';
	import { parseJsonLoose } from '#lib/import/parseJsonLoose.ts';
	import { validate } from '#lib/schemas/errors.ts';

	/**
	 * Paste area for the AI's JSON: parsed and validated on every change (French errors with
	 * the field path). `children` renders the valid document (preview, import button).
	 */
	let {
		schema,
		value = $bindable(''),
		placeholder,
		label = fr.import.paste,
		children
	}: {
		schema: z.ZodType<T>;
		value?: string;
		placeholder: string;
		/** Field label (default: the AI's answer). */
		label?: string;
		children: Snippet<[T]>;
	} = $props();

	const t = fr.import;

	const parsed = $derived.by(() => {
		if (!value.trim()) return null;
		const json = parseJsonLoose(value);
		if (!json.ok) return { success: false as const, errors: [json.error] };
		return validate(schema, json.value);
	});
</script>

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
