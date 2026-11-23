<script lang="ts">
	import { session } from '#lib/auth.svelte.ts';
	import ProfileLookForm from '#lib/components/ProfileLookForm.svelte';
	import { fr } from '#lib/i18n/fr.ts';
	import { connectivity } from '#lib/online.svelte.ts';

	const t = fr.devices;

	let unlinking = $state(false);
	let unlinkError = $state(false);

	async function unlink() {
		if (!confirm(t.unlinkThisConfirm)) return;
		unlinking = true;
		unlinkError = false;
		try {
			await session.unlinkThisDevice();
		} catch (error) {
			console.error('[me] unlink', error);
			unlinkError = true;
			unlinking = false;
		}
	}
</script>

<svelte:head><title>{fr.me.title} · {fr.app.name}</title></svelte:head>

<main class="stack">
	<h1>{fr.me.title}</h1>
	{#if session.familyId && session.profile}
		<ProfileLookForm familyId={session.familyId} profile={session.profile} />
	{/if}

	{#if session.isChild}
		<section class="card stack">
			<h2>{t.unlinkThis}</h2>
			<p class="muted small">{t.unlinkThisHelp}</p>
			{#if unlinkError}<p class="error">{t.unlinkFailed}</p>{/if}
			{#if !connectivity.online}<p class="warning">{fr.common.needsOnline}</p>{/if}
			<button onclick={unlink} disabled={unlinking || !connectivity.online}>{t.unlinkThis}</button>
		</section>
	{/if}
</main>
