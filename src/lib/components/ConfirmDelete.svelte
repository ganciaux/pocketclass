<script lang="ts">
	import { fr } from '#lib/i18n/fr.ts';
	import { connectivity } from '#lib/online.svelte.ts';

	/**
	 * "Danger zone": the action only runs once the user typed the confirmation word
	 * (fr.common.confirmWord). Reusable for any irreversible deletion.
	 */
	let {
		title,
		help,
		action,
		onconfirm
	}: {
		title: string;
		help: string;
		/** Button label. */
		action: string;
		/** Throws on failure (the error message is shown). */
		onconfirm: () => Promise<void>;
	} = $props();

	const t = fr.common;

	let typed = $state('');
	let running = $state(false);
	let failed = $state(false);
	const confirmed = $derived(typed.trim() === t.confirmWord);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!confirmed) return;
		running = true;
		failed = false;
		try {
			await onconfirm();
		} catch (error) {
			console.error('[confirm-delete]', error);
			failed = true;
		} finally {
			running = false;
		}
	}
</script>

<form class="card border-2 border-error/60 bg-base-100" onsubmit={submit}>
	<div class="card-body gap-3">
		<h2 class="card-title text-error">{title}</h2>
		<p class="text-sm">{help}</p>
		<label class="fieldset">
			<span class="fieldset-legend">{t.confirmPrompt(t.confirmWord)}</span>
			<input class="input w-full" bind:value={typed} autocomplete="off" spellcheck="false" />
		</label>
		{#if failed}<p role="alert" class="alert alert-error alert-soft">{t.deleteFailed}</p>{/if}
		{#if !connectivity.online}<p class="alert alert-warning alert-soft">{t.needsOnline}</p>{/if}
		<button
			class="btn btn-error"
			type="submit"
			disabled={!confirmed || running || !connectivity.online}
		>
			{running ? t.deleting : action}
		</button>
	</div>
</form>
