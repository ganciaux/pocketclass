<script lang="ts">
	import type { Snippet } from 'svelte';
	import logo from '#lib/assets/logo.webp';
	import { session } from '#lib/auth.svelte.ts';
	import LinkDeviceForm from '#lib/components/LinkDeviceForm.svelte';
	import PasswordSignIn from '#lib/components/PasswordSignIn.svelte';
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
	<main class="doodles max-w-md">
		<header class="flex flex-col items-center gap-2 text-center">
			<img
				src={logo}
				alt={fr.app.name}
				width="640"
				height="640"
				class="w-64 rounded-box shadow-lg"
			/>
			<p class="text-lg text-base-content/80">{fr.app.tagline}</p>
		</header>
		{#if session.status === 'notLinked' && !session.linking}
			<p role="alert" class="alert alert-warning alert-soft">{fr.auth.notLinked}</p>
		{/if}
		<LinkDeviceForm />
		<section class="card card-border bg-base-100">
			<div class="card-body gap-3">
				<h2 class="card-title">{fr.auth.parentTitle}</h2>
				<button class="btn" onclick={signIn}>{fr.auth.signInWithGoogle}</button>
				{#if signInError}
					<p role="alert" class="alert alert-error alert-soft">{fr.auth.signInFailed}</p>
				{/if}
				<PasswordSignIn />
			</div>
		</section>
	</main>
{:else if session.status === 'error'}
	<main>
		<p role="alert" class="alert alert-error alert-soft">{fr.auth.loadFailed}</p>
		<button class="btn" onclick={() => session.retry()}>{fr.auth.retry}</button>
	</main>
{:else}
	<main>
		<span class="loading loading-dots loading-md text-primary" aria-label={fr.app.loading}></span>
	</main>
{/if}
