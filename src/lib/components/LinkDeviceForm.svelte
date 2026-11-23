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

<form class="card stack" onsubmit={submit}>
	<h2>{t.childTitle}</h2>
	<p class="muted">{t.linkHelp}</p>
	<label>
		{t.linkCode}
		<input
			class="mono code"
			bind:value={input}
			autocomplete="one-time-code"
			autocapitalize="characters"
			spellcheck="false"
			maxlength={LINK_CODE_LENGTH + 2}
			placeholder="ABC 234"
		/>
	</label>
	{#if errorMessage}<p class="error">{errorMessage}</p>{/if}
	{#if !connectivity.online}<p class="warning">{fr.devices.offline}</p>{/if}
	<button class="primary" type="submit" disabled={session.linking || !connectivity.online}>
		{session.linking ? t.linking : t.linkSubmit}
	</button>
</form>

<style>
	.code {
		font-size: 1.4rem;
		letter-spacing: 0.2em;
		text-align: center;
		text-transform: uppercase;
	}
</style>
