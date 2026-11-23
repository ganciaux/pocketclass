<script lang="ts">
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import { session } from '#lib/auth.svelte.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { resolve } from '$app/paths';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	let signInError = $state(false);
	let online = $state(navigator.onLine);

	session.start();

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

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>{fr.app.name}</title>
</svelte:head>

<svelte:window ononline={() => (online = true)} onoffline={() => (online = false)} />

<header class="app-header">
	<a class="brand" href={resolve('/')}>{fr.app.name}</a>
	<span class="row">
		{#if !online}<span class="offline" role="status">{fr.app.offline}</span>{/if}
		{#if session.status === 'ready' || session.status === 'error'}
			<button class="link" onclick={() => session.signOut()}>{fr.auth.signOut}</button>
		{/if}
	</span>
</header>

{#if session.status === 'loading'}
	<main><p class="muted">{fr.app.loading}</p></main>
{:else if session.status === 'signedOut'}
	<main class="stack sign-in">
		<h1>{fr.app.name}</h1>
		<p class="muted">{fr.app.tagline}</p>
		<button class="primary" onclick={signIn}>{fr.auth.signInWithGoogle}</button>
		{#if signInError}<p class="error">{fr.auth.signInFailed}</p>{/if}
	</main>
{:else if session.status === 'error'}
	<main>
		<p class="error">{session.user?.isAnonymous ? fr.auth.notLinked : fr.auth.loadFailed}</p>
	</main>
{:else}
	{@render children()}
{/if}

<style>
	.app-header {
		position: sticky;
		top: 0;
		z-index: 10;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		padding-top: calc(var(--space-2) + env(safe-area-inset-top));
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
	}

	.brand {
		font-weight: 700;
		color: var(--color-text);
		text-decoration: none;
	}

	.offline {
		padding: 0.1rem var(--space-2);
		border-radius: 999px;
		background: var(--color-warning-bg);
		color: var(--color-warning);
		font-size: 0.8rem;
		font-weight: 600;
	}

	.link {
		min-height: auto;
		padding: var(--space-1) var(--space-2);
		border: none;
		background: none;
		color: var(--color-muted);
		font-size: 0.9rem;
	}

	.sign-in {
		text-align: center;
		padding-top: var(--space-5);
	}
</style>
