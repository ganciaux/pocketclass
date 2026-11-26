<script lang="ts">
	import BackLink from '#lib/components/BackLink.svelte';
	import ConfirmDialog from '#lib/components/ConfirmDialog.svelte';
	import { resolve } from '$app/paths';
	import { session } from '#lib/auth.svelte.ts';
	import PasswordForm from '#lib/components/PasswordForm.svelte';
	import ProfileLookForm from '#lib/components/ProfileLookForm.svelte';
	import ThemeChoice from '#lib/components/ThemeChoice.svelte';
	import ExportButton from '#lib/components/ExportButton.svelte';
	import { exportFamily } from '#lib/data/catalogExport.ts';
	import { exportFileName } from '#lib/import/catalogExport.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { connectivity } from '#lib/online.svelte.ts';

	const t = fr.devices;

	let unlinking = $state(false);
	let unlinkError = $state(false);
	let asking = $state(false);

	async function unlink() {
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

	<ThemeChoice />

	{#if session.isAdmin && session.familyId && !session.childView}
		{@const familyId = session.familyId}
		<section class="card card-border bg-base-100">
			<div class="card-body gap-3">
				<h2 class="card-title">{fr.export.familyTitle}</h2>
				<p class="text-sm text-base-content/70">{fr.export.familyHelp}</p>
				<ExportButton
					label={fr.export.familyButton}
					fileName={exportFileName('sauvegarde', new Date().toISOString().slice(0, 10))}
					load={() => exportFamily(familyId)}
				/>
			</div>
		</section>
	{/if}

	<!-- Parents only (children use an anonymous account linked by code). -->
	{#if session.isAdmin && session.user?.email && !session.user.isAnonymous}
		<PasswordForm email={session.user.email} />
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
					class="btn btn-soft btn-error self-start"
					onclick={() => (asking = true)}
					disabled={unlinking || !connectivity.online}
				>
					{t.unlinkThis}
				</button>
			</div>
		</section>
	{/if}
	{#if asking}
		<ConfirmDialog
			title={t.unlinkThisConfirm}
			message={t.unlinkThisConfirmHelp}
			confirmLabel={t.unlinkThis}
			danger
			onconfirm={unlink}
			onclose={() => (asking = false)}
		/>
	{/if}
</main>
