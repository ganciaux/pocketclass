<script lang="ts">
	import type { Snippet } from 'svelte';
	import { session } from '#lib/auth.svelte.ts';
	import LinkDeviceForm from '#lib/components/LinkDeviceForm.svelte';
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
{:else if session.status === 'signedOut' || session.status === 'notLinked' || session.linking}
	<!-- One branch for both states (and while linking): the link form stays mounted. -->
	<main class="stack sign-in">
		<header class="stack-tight">
			<h1>{fr.app.name}</h1>
			<p class="muted">{fr.app.tagline}</p>
		</header>
		{#if session.status === 'notLinked' && !session.linking}
			<p class="warning">{fr.auth.notLinked}</p>
		{/if}
		<LinkDeviceForm />
		<section class="card stack">
			<h2>{fr.auth.parentTitle}</h2>
			<button onclick={signIn}>{fr.auth.signInWithGoogle}</button>
			{#if signInError}<p class="error">{fr.auth.signInFailed}</p>{/if}
		</section>
	</main>
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
		max-width: 26rem;
		padding-top: var(--space-4);
	}

	.sign-in header {
		text-align: center;
	}
</style>
