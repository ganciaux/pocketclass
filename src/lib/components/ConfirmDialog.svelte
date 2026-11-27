<script lang="ts">
	import { fr } from '#lib/i18n/fr.ts';

	/**
	 * A yes / no question in a modal (instead of the browser's `confirm()`). Mount it when needed
	 * (`{#if asking}`); `onclose` runs on « Annuler », Esc, a click outside, or after `onconfirm`.
	 * `danger`: the confirm button is red (deleting, resetting). For a deletion that needs typing
	 * « SUPPRIMER », use `<ConfirmDeleteDialog>`.
	 */
	let {
		title,
		message,
		confirmLabel,
		danger = false,
		onconfirm,
		onclose
	}: {
		title: string;
		message?: string;
		confirmLabel: string;
		danger?: boolean;
		onconfirm: () => void | Promise<void>;
		onclose: () => void;
	} = $props();

	let dialog: HTMLDialogElement | undefined;
	let busy = $state(false);
	$effect(() => dialog?.showModal());

	async function confirm() {
		busy = true;
		try {
			await onconfirm();
		} finally {
			busy = false;
			// `onconfirm` may unmount this dialog (e.g. a session reload): it is gone then.
			dialog?.close();
		}
	}
</script>

<dialog bind:this={dialog} class="modal modal-bottom sm:modal-middle" {onclose}>
	<div class="modal-box flex flex-col gap-3">
		<h2 class="text-lg font-bold">{title}</h2>
		{#if message}<p class="text-base-content/80">{message}</p>{/if}
		<div class="modal-action mt-2">
			<form method="dialog"><button class="btn btn-ghost">{fr.common.cancel}</button></form>
			<button
				class={['btn', danger ? 'btn-error' : 'btn-primary']}
				disabled={busy}
				onclick={confirm}
			>
				{#if busy}<span class="loading loading-spinner loading-sm"></span>{/if}
				{confirmLabel}
			</button>
		</div>
	</div>
	<form method="dialog" class="modal-backdrop"><button>{fr.common.cancel}</button></form>
</dialog>
