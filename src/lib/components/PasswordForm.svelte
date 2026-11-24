<script lang="ts">
	import { authErrorKey, PASSWORD_MIN, passwordProblem } from '#lib/account/password.ts';
	import { session } from '#lib/auth.svelte.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { connectivity } from '#lib/online.svelte.ts';

	/** Parent: a password on their Google account, to sign in without Google. */
	let { email }: { email: string } = $props();

	const t = fr.account;

	let password = $state('');
	let confirm = $state('');
	let touched = $state(false);
	let saving = $state(false);
	let saved = $state(false);
	let error = $state<string | null>(null);

	const problem = $derived(passwordProblem(password, confirm));
	const problemText = $derived(
		problem === 'tooShort' ? t.tooShort(PASSWORD_MIN) : problem === 'mismatch' ? t.mismatch : null
	);

	async function save(event: SubmitEvent) {
		event.preventDefault();
		touched = true;
		if (problem) return;
		saving = true;
		saved = false;
		error = null;
		try {
			await session.setPassword(password);
			saved = true;
			password = '';
			confirm = '';
			touched = false;
		} catch (err) {
			console.error('[account] set password', err);
			error = t.errors[authErrorKey((err as { code?: string }).code)];
		} finally {
			saving = false;
		}
	}
</script>

<section class="card card-border bg-base-100">
	<form class="card-body gap-3" onsubmit={save}>
		<h2 class="card-title">{t.title}</h2>
		<p class="text-sm text-base-content/70">{t.help}</p>
		<!-- The e-mail of the account: helps password managers, cannot be changed here. -->
		<label class="fieldset">
			<span class="fieldset-legend">{t.email}</span>
			<input class="input w-full" type="email" value={email} autocomplete="username" readonly />
		</label>
		<label class="fieldset">
			<span class="fieldset-legend">{t.password}</span>
			<input
				class="input w-full"
				type="password"
				autocomplete="new-password"
				bind:value={password}
				oninput={() => (saved = false)}
			/>
		</label>
		<label class="fieldset">
			<span class="fieldset-legend">{t.confirm}</span>
			<input
				class="input w-full"
				type="password"
				autocomplete="new-password"
				bind:value={confirm}
				onblur={() => (touched = password !== '' || confirm !== '')}
			/>
		</label>
		{#if touched && problemText}
			<p role="alert" class="text-sm text-error">{problemText}</p>
		{/if}
		{#if error}<p role="alert" class="alert alert-error alert-soft">{error}</p>{/if}
		{#if saved}<p role="status" class="alert alert-success alert-soft">{t.saved}</p>{/if}
		{#if !connectivity.online}
			<p class="alert alert-warning alert-soft">{fr.common.needsOnline}</p>
		{/if}
		<button class="btn btn-primary self-start" disabled={saving || !connectivity.online}>
			{saving ? t.saving : session.hasPassword ? t.change : t.set}
		</button>
	</form>
</section>
