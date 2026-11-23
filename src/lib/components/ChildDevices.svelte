<script lang="ts">
	import LoadState from '#lib/components/LoadState.svelte';
	import { createLinkCode, unlinkDevice, watchDevicesOf } from '#lib/data/devices.ts';
	import { live } from '#lib/data/live.svelte.ts';
	import { formatDate, fr } from '#lib/i18n/fr.ts';
	import { formatLinkCode, LINK_CODE_TTL_MS } from '#lib/linking/linkCode.ts';
	import { connectivity } from '#lib/online.svelte.ts';

	/** Parent side of device linking for one child: new code, linked devices, unlink. */
	let { familyId, profileId }: { familyId: string; profileId: string } = $props();

	const t = fr.devices;
	const devicesLive = live(() => watchDevicesOf(familyId, profileId));

	let code = $state<string | null>(null);
	let creating = $state(false);
	let errorMessage = $state<string | null>(null);

	async function newCode() {
		creating = true;
		errorMessage = null;
		try {
			code = await createLinkCode(familyId, profileId);
		} catch (error) {
			console.error('[devices] code', error);
			errorMessage = t.codeFailed;
		} finally {
			creating = false;
		}
	}

	async function unlink(uid: string) {
		errorMessage = null;
		try {
			await unlinkDevice(familyId, uid);
		} catch (error) {
			console.error('[devices] unlink', error);
			errorMessage = t.unlinkFailed;
		}
	}
</script>

<section class="card card-border bg-base-100">
	<div class="card-body gap-3">
		<h2 class="card-title">{t.title}</h2>
		<LoadState source={devicesLive} failed={t.loadFailed}>
			{#snippet children(devices)}
				<ul class="flex flex-col gap-1">
					{#each devices as device (device.id)}
						<li class="flex items-center justify-between gap-2">
							<span>
								{t.linkedOn(device.linkedAt ? formatDate(device.linkedAt.toDate()) : '…')}
							</span>
							<button class="btn btn-ghost btn-sm" onclick={() => unlink(device.id)}>
								{t.unlink}
							</button>
						</li>
					{:else}
						<li class="text-base-content/70">{t.none}</li>
					{/each}
				</ul>
			{/snippet}
		</LoadState>

		<!-- Hidden once a device used it (single use). -->
		{#if code && !devicesLive.data?.some((d) => d.code === code)}
			<div class="flex flex-col gap-2 rounded-box bg-neutral p-4 text-neutral-content">
				<p class="code-display text-4xl text-primary" aria-live="polite">{formatLinkCode(code)}</p>
				<p class="text-sm">{t.codeHelp(LINK_CODE_TTL_MS / 60_000)}</p>
			</div>
		{/if}
		{#if errorMessage}<p role="alert" class="alert alert-error alert-soft">{errorMessage}</p>{/if}
		{#if !connectivity.online}
			<p class="alert alert-warning alert-soft">{fr.common.needsOnline}</p>
		{/if}
		<button class="btn" onclick={newCode} disabled={creating || !connectivity.online}>
			{creating ? t.creatingCode : t.createCode}
		</button>
	</div>
</section>
