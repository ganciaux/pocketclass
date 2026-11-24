<script lang="ts">
	import { authErrorKey } from '#lib/account/password.ts';
	import { session } from '#lib/auth.svelte.ts';
	import { fr } from '#lib/i18n/fr.ts';

	/** Parent sign-in with the password linked to their Google account (no sign-up here). */
	const t = fr.account;

	let email = $state('');
	let password = $state('');
	let busy = $state(false);
	let error = $state<string | null>(null);
	let resetSent = $state(false);

	const codeOf = (err: unknown) => (err as { code?: string }).code;

	async function signIn(event: SubmitEvent) {
		event.preventDefault();
		busy = true;
		error = null;
		resetSent = false;
		try {
			await session.signInWithPassword(email, password);
		} catch (err) {
			console.error('[auth] password sign-in', err);
			error = t.errors[authErrorKey(codeOf(err))];
			busy = false;
		}
	}

	/** Always the same message (whether the account exists or not), unless the input is wrong. */
	async function forgot() {
		error = null;
		resetSent = false;
		try {
			await session.sendPasswordReset(email);
			resetSent = true;
		} catch (err) {
			const key = authErrorKey(codeOf(err));
			if (key === 'invalidEmail' || key === 'offline' || key === 'tooManyRequests') {
				error = t.errors[key];
			} else {
				resetSent = true;
			}
		}
	}
</script>

<div class="divider my-0 text-sm text-base-content/60">{t.or}</div>
<form class="flex flex-col gap-2" onsubmit={signIn}>
	<label class="fieldset">
		<span class="fieldset-legend">{t.email}</span>
		<input class="input w-full" type="email" autocomplete="username" bind:value={email} />
	</label>
	<label class="fieldset">
		<span class="fieldset-legend">{t.password}</span>
		<input
			class="input w-full"
			type="password"
			autocomplete="current-password"
			bind:value={password}
		/>
	</label>
	{#if error}<p role="alert" class="alert alert-error alert-soft">{error}</p>{/if}
	{#if resetSent}<p role="status" class="alert alert-info alert-soft">{t.resetSent}</p>{/if}
	<div class="flex flex-wrap items-center gap-2">
		<button class="btn btn-primary" disabled={busy || !email.trim() || !password}>
			{busy ? t.signingIn : t.signIn}
		</button>
		<button type="button" class="btn btn-link btn-sm" disabled={!email.trim()} onclick={forgot}>
			{t.forgot}
		</button>
	</div>
</form>
