<script lang="ts">
	import 'katex/dist/katex.min.css';
	import '../app.css';
	import { session } from '#lib/auth.svelte.ts';
	import Avatar from '#lib/components/Avatar.svelte';
	import SessionGate from '#lib/components/SessionGate.svelte';
	import { fr } from '#lib/i18n/fr.ts';
	import { connectivity } from '#lib/online.svelte.ts';
	import { resolve } from '$app/paths';
	import { registerSW } from 'virtual:pwa-register';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	session.start();
	// Service worker (app shell cache). autoUpdate: a new version is activated on next load.
	registerSW({ immediate: true });
</script>

<svelte:head>
	<title>{fr.app.name}</title>
</svelte:head>

<header class="app-header">
	<a class="brand" href={resolve('/')}>{fr.app.name}</a>
	<span class="row">
		{#if !connectivity.online}<span class="pill warning" role="status">{fr.app.offline}</span>{/if}
		{#if session.status === 'ready' && session.profile}
			<a class="me" href={resolve('/me')} aria-label={fr.me.open} title={fr.me.open}>
				<Avatar profile={session.profile} size={2} />
			</a>
		{/if}
		<!-- Children never sign out (the anonymous account would be lost): see "Unlink" on /me. -->
		{#if session.user && !session.isChild}
			<button class="link" onclick={() => session.signOut()}>{fr.auth.signOut}</button>
		{/if}
	</span>
</header>

<SessionGate>
	{@render children()}
</SessionGate>

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

	.me {
		display: inline-flex;
		border-radius: 50%;
	}

	.brand {
		font-weight: 700;
		color: var(--color-text);
		text-decoration: none;
	}
</style>
