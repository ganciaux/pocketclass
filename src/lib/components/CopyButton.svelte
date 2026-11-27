<script lang="ts">
	import { fr } from '#lib/i18n/fr.ts';

	/** Copies a text for the external AI (a prompt, a fix request), then says it is copied. */
	let { text, label }: { text: string; label: string } = $props();

	const t = fr.import;
	let status = $state<'idle' | 'copied' | 'failed'>('idle');
	// « Copié » is about this text: a new one (other errors, other prompt) is not copied yet.
	$effect(() => {
		void text;
		status = 'idle';
	});

	async function copy() {
		try {
			await navigator.clipboard.writeText(text);
			status = 'copied';
		} catch (error) {
			console.error('[copy] failed', error);
			status = 'failed';
		}
	}
</script>

<div class="flex flex-wrap items-center gap-2">
	<button class="btn btn-soft btn-primary btn-sm" type="button" onclick={copy}>{label}</button>
	{#if status === 'copied'}<span class="text-sm text-success" role="status">{t.copied}</span>{/if}
</div>
{#if status === 'failed'}<p class="alert alert-warning alert-soft">{t.copyFailed}</p>{/if}
