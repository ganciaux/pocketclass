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
	const inputId = $props.id();

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

<form class="card stack danger" onsubmit={submit}>
	<h2>{title}</h2>
	<p class="small">{help}</p>
	<label for={inputId}>{t.confirmPrompt(t.confirmWord)}</label>
	<input id={inputId} bind:value={typed} autocomplete="off" spellcheck="false" />
	{#if failed}<p class="error">{t.deleteFailed}</p>{/if}
	{#if !connectivity.online}<p class="warning">{t.needsOnline}</p>{/if}
	<button class="danger" type="submit" disabled={!confirmed || running || !connectivity.online}>
		{running ? t.deleting : action}
	</button>
</form>

<style>
	.danger {
		border-color: var(--color-danger);
	}

	button.danger:not(:disabled) {
		background: var(--color-danger);
		border-color: var(--color-danger);
		color: var(--color-surface);
	}
</style>
