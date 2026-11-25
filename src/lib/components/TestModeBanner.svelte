<script lang="ts">
	import { session } from '#lib/auth.svelte.ts';
	import { resetTestData } from '#lib/data/family.ts';
	import ConfirmDialog from '#lib/components/ConfirmDialog.svelte';
	import { fr } from '#lib/i18n/fr.ts';
	import { connectivity } from '#lib/online.svelte.ts';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	/** Child test mode: shown on every page while a parent uses the app as a child. */
	const t = fr.testMode;

	let resetting = $state(false);
	let asking = $state(false);
	let resetError = $state(false);

	async function reset() {
		const familyId = session.familyId;
		const profileId = session.profileId;
		if (!familyId || !profileId) return;
		resetting = true;
		resetError = false;
		try {
			await resetTestData(familyId, profileId);
		} catch (error) {
			console.error('[test mode] reset', error);
			resetError = true;
		} finally {
			resetting = false;
		}
	}

	async function stop() {
		session.stopTest();
		await goto(resolve('/'));
	}
</script>

{#if session.childView?.testing}
	<div class="flex flex-col gap-2 bg-info/15 px-4 py-2 text-sm" role="status">
		<div class="flex flex-wrap items-center gap-2">
			<strong class="flex-1 basis-48">{t.banner(session.childView.name)}</strong>
			<button
				class="btn btn-ghost btn-sm"
				onclick={() => (asking = true)}
				disabled={resetting || !connectivity.online}
			>
				{t.reset}
			</button>
			<button class="btn btn-soft btn-primary btn-sm" onclick={stop}>{t.stop}</button>
		</div>
		{#if resetError}
			<p role="alert" class="alert alert-error alert-soft">{t.resetFailed}</p>
		{/if}
	</div>
	{#if asking}
		<ConfirmDialog
			title={t.resetConfirm}
			confirmLabel={t.reset}
			danger
			onconfirm={reset}
			onclose={() => (asking = false)}
		/>
	{/if}
{/if}
