<script lang="ts">
	import BackLink from '#lib/components/BackLink.svelte';
	import { fr } from '#lib/i18n/fr.ts';
	import { renderInline } from '#lib/render/markdown.ts';
	import { resolve } from '$app/paths';

	/** Top of a practice, challenge or assessment page: back to the sheet, what it is, its title. */
	let { sheet, label }: { sheet: { id: string; title: string }; label: string } = $props();
</script>

<BackLink href={resolve('/concept/[id]', { id: sheet.id })} label={fr.practice.sheet} />
<header class="flex flex-col gap-1">
	<span class="text-sm font-bold text-base-content/60">{label}</span>
	<h1>{@html renderInline(sheet.title)}</h1>
</header>
