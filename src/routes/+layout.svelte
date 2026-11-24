<script lang="ts">
	import 'katex/dist/katex.min.css';
	import '../app.css';
	import { session } from '#lib/auth.svelte.ts';
	import Avatar from '#lib/components/Avatar.svelte';
	import SessionGate from '#lib/components/SessionGate.svelte';
	import UpdateToast from '#lib/components/UpdateToast.svelte';
	import { fr } from '#lib/i18n/fr.ts';
	import { connectivity } from '#lib/online.svelte.ts';
	import { appUpdate } from '#lib/update.svelte.ts';
	import { onNavigate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	session.start();
	// Service worker (app shell cache); new versions are offered by <UpdateToast>.
	appUpdate.start();

	// Page transitions (animation in app.css). Skipped where the API is missing, and within a
	// page (query or hash changes).
	onNavigate((navigation) => {
		if (!document.startViewTransition) return;
		if (navigation.from?.url.pathname === navigation.to?.url.pathname) return;
		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
</script>

<svelte:head>
	<title>{fr.app.name}</title>
</svelte:head>

<!-- Slate strip in both themes, lettered like the logo. -->
<header
	class="navbar sticky top-0 z-10 min-h-14 gap-2 bg-neutral px-4 pt-[max(0.5rem,env(safe-area-inset-top))] text-neutral-content"
>
	<a class="flex-1 font-display text-2xl leading-none" href={resolve('/')} aria-label={fr.app.name}>
		Pocket<span class="text-primary">Class</span>
	</a>
	{#if !connectivity.online}
		<span class="badge badge-warning badge-sm" role="status">{fr.app.offline}</span>
	{/if}
	{#if session.status === 'ready' && session.profile}
		<a class="rounded-full" href={resolve('/me')} aria-label={fr.me.title} title={fr.me.title}>
			<Avatar profile={session.profile} size={2} />
		</a>
	{/if}
	<!-- Children (anonymous accounts) never sign out: the account would be lost. See /me. -->
	{#if session.user && !session.user.isAnonymous}
		<button class="btn btn-ghost btn-sm text-neutral-content" onclick={() => session.signOut()}>
			{fr.auth.signOut}
		</button>
	{/if}
</header>

<SessionGate>
	{@render children()}
</SessionGate>

<UpdateToast />
