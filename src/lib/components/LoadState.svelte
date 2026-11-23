<script lang="ts" generics="T">
	import type { Snippet } from 'svelte';
	import type { Live } from '#lib/data/live.svelte.ts';
	import { fr } from '#lib/i18n/fr.ts';

	/**
	 * Renders the loading / missing / error states of a `live()` value, and `children` with the
	 * (non-null) data once ready.
	 */
	let {
		source,
		notFound,
		failed,
		children
	}: {
		source: Live<T>;
		notFound: string;
		failed: string;
		children: Snippet<[T]>;
	} = $props();
</script>

{#if source.status === 'ready' && source.data !== null}
	{@render children(source.data)}
{:else if source.status === 'missing'}
	<p class="error">{notFound}</p>
{:else if source.status === 'error'}
	<p class="error">{failed}</p>
{:else}
	<p class="muted">{fr.app.loading}</p>
{/if}
