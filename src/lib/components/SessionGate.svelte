<script lang="ts">
	import type { Snippet } from 'svelte';
	import { session } from '#lib/auth.svelte.ts';
	import { fr } from '#lib/i18n/fr.ts';

	/** Renders the app only once the session is ready; sign-in and error screens otherwise. */
	let { children }: { children: Snippet } = $props();

	let signInError = $state(false);

	async function signIn() {
		signInError = false;
		try {
			await session.signInWithGoogle();
		} catch (error) {
			console.error('[auth] sign-in failed', error);
			signInError = true;
		}
	}
</script>

{#if session.status === 'ready'}
	{@render children()}
{:else if session.status === 'signedOut'}
	<main class="stack sign-in">
		<h1>{fr.app.name}</h1>
		<p class="muted">{fr.app.tagline}</p>
		<button class="primary" onclick={signIn}>{fr.auth.signInWithGoogle}</button>
		{#if signInError}<p class="error">{fr.auth.signInFailed}</p>{/if}
	</main>
{:else if session.status === 'notLinked'}
	<main><p class="error">{fr.auth.notLinked}</p></main>
{:else if session.status === 'error'}
	<main class="stack">
		<p class="error">{fr.auth.loadFailed}</p>
		<button onclick={() => session.retry()}>{fr.auth.retry}</button>
	</main>
{:else}
	<main><p class="muted">{fr.app.loading}</p></main>
{/if}

<style>
	.sign-in {
		text-align: center;
		padding-top: var(--space-5);
	}
</style>
