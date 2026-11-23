<script lang="ts">
	import { session } from '#lib/auth.svelte.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import type { LayoutProps } from './$types';

	// UX guard only: the real protection is in firestore.rules.
	let { children }: LayoutProps = $props();
</script>

{#if session.isAdmin}
	{@render children()}
{:else}
	<main><p class="error">{fr.parent.adminOnly}</p></main>
{/if}
