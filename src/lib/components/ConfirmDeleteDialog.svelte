<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import ConfirmDelete from '#lib/components/ConfirmDelete.svelte';
	import { fr } from '#lib/i18n/fr.ts';

	/**
	 * `<ConfirmDelete>` in a modal, for a delete button in a list row. Mount it when needed
	 * (`{#if target}`); `onclose` runs on Esc, a click outside, or after the deletion.
	 */
	let {
		onclose,
		onconfirm,
		...confirm
	}: ComponentProps<typeof ConfirmDelete> & { onclose: () => void } = $props();

	let dialog: HTMLDialogElement;
	$effect(() => dialog.showModal());

	async function run() {
		await onconfirm();
		onclose();
	}
</script>

<dialog bind:this={dialog} class="modal" {onclose}>
	<div class="modal-box p-0">
		<ConfirmDelete {...confirm} onconfirm={run} />
	</div>
	<form method="dialog" class="modal-backdrop"><button>{fr.common.cancel}</button></form>
</dialog>
