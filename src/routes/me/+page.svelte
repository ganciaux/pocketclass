<script lang="ts">
	import BackLink from '#lib/components/BackLink.svelte';
	import { resolve } from '$app/paths';
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

<main>
	<BackLink href={resolve('/')} label={fr.app.home} />
	<h1>{fr.me.title}</h1>
	{#if session.familyId && session.profile}
		<ProfileLookForm familyId={session.familyId} profile={session.profile} />
	{/if}

	{#if session.isChild}
		<section class="card card-border bg-base-100">
			<div class="card-body gap-3">
				<h2 class="card-title">{t.unlinkThis}</h2>
				<p class="text-sm text-base-content/70">{t.unlinkThisHelp}</p>
				{#if unlinkError}<p role="alert" class="alert alert-error alert-soft">
						{t.unlinkFailed}
					</p>{/if}
				{#if !connectivity.online}
					<p class="alert alert-warning alert-soft">{fr.common.needsOnline}</p>
				{/if}
				<button
					class="btn btn-outline btn-error self-start"
					onclick={unlink}
					disabled={unlinking || !connectivity.online}
				>
					{t.unlinkThis}
				</button>
			</div>
		</section>
	{/if}
</main>
