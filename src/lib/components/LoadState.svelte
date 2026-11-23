<script lang="ts" generics="T">
	import type { Snippet } from 'svelte';
	import type { Live } from '#lib/data/live.svelte.ts';
	import { fr } from '#lib/i18n/fr.ts';

	/**
	 * Renders the loading / missing / error states of a `live()` value, and `children` with the
	 * data once ready. `notFound` is only needed for documents (a list is never "missing").
	 */
	let {
		source,
		failed,
		notFound = '',
		children
	}: {
		source: Live<T>;
		failed: string;
		notFound?: string;
		children: Snippet<[T]>;
	} = $props();
</script>

<!-- `data !== null` is implied by 'ready'; the check narrows the type for the snippet. -->
{#if source.status === 'ready' && source.data !== null}
	{@render children(source.data)}
{:else if source.status === 'missing'}
	<p role="alert" class="alert alert-warning alert-soft">{notFound}</p>
{:else if source.status === 'error'}
	<p role="alert" class="alert alert-error alert-soft">{failed}</p>
{:else}
	<span class="loading loading-dots loading-md text-primary" aria-label={fr.app.loading}></span>
{/if}
