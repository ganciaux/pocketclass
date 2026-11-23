<script lang="ts">
	import { session } from '#lib/auth.svelte.ts';
	import { InvalidLinkCodeError } from '#lib/data/devices.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { LINK_CODE_LENGTH, normalizeLinkCode } from '#lib/linking/linkCode.ts';
	import { connectivity } from '#lib/online.svelte.ts';

	/** Child side of device linking: types the code shown on the parent's phone. */
	const t = fr.auth;

	let input = $state('');
	let errorMessage = $state<string | null>(null);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		errorMessage = null;
		const code = normalizeLinkCode(input);
		if (!code) {
			errorMessage = t.linkCodeFormat;
			return;
		}
		try {
			await session.linkDevice(code);
		} catch (error) {
			console.error('[link] failed', error);
			errorMessage = error instanceof InvalidLinkCodeError ? t.linkInvalid : t.linkFailed;
		}
	}
</script>

<form class="card border-2 border-primary bg-base-100" onsubmit={submit}>
	<div class="card-body gap-3">
		<h2 class="card-title">{t.childTitle}</h2>
		<p class="text-base-content/70">{t.linkHelp}</p>
		<label class="fieldset">
			<span class="fieldset-legend">{t.linkCode}</span>
			<input
				class="input input-lg code-display w-full"
				bind:value={input}
				autocomplete="one-time-code"
				autocapitalize="characters"
				spellcheck="false"
				maxlength={LINK_CODE_LENGTH + 2}
				placeholder={t.linkCodePlaceholder}
			/>
		</label>
		{#if errorMessage}<p role="alert" class="alert alert-error alert-soft">{errorMessage}</p>{/if}
		{#if !connectivity.online}
			<p class="alert alert-warning alert-soft">{fr.common.needsOnline}</p>
		{/if}
		<button
			class="btn btn-primary"
			type="submit"
			disabled={session.linking || !connectivity.online}
		>
			{session.linking ? t.linking : t.linkSubmit}
		</button>
	</div>
</form>
