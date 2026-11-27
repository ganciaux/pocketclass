<script lang="ts">
	import { UI_ICONS } from '#lib/binder/icons.ts';
	import ConfirmDialog from '#lib/components/ConfirmDialog.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { fr } from '#lib/i18n/fr.ts';
	import { ImageTooLargeError, imageFileToPicture } from '#lib/profile/avatar.ts';

	/**
	 * A few pictures added by the parent (mind map, a section of the sheet): tap to enlarge. The
	 * parent (`canEdit`) adds one (scaled down to WebP) while there is room, and deletes them.
	 */
	let {
		images,
		max,
		canEdit,
		addLabel,
		alt,
		deleteTitle,
		onadd,
		ondelete
	}: {
		images: { id: string; dataUrl: string }[];
		max: number;
		canEdit: boolean;
		addLabel: string;
		/** Text alternative of the n-th picture (1-based). */
		alt: (n: number) => string;
		deleteTitle: string;
		onadd: (dataUrl: string) => void;
		ondelete: (id: string) => void;
	} = $props();

	let busy = $state(false);
	let error = $state<string | null>(null);
	let zoomed = $state<{ dataUrl: string; n: number } | null>(null);
	let deletingId = $state<string | null>(null);
	let dialog = $state<HTMLDialogElement>();

	async function pick(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		busy = true;
		error = null;
		try {
			onadd(await imageFileToPicture(file));
		} catch (failure) {
			console.error('[picture]', failure);
			error = failure instanceof ImageTooLargeError ? fr.look.imageTooLarge : fr.look.imageFailed;
		} finally {
			busy = false;
		}
	}

	function zoom(dataUrl: string, n: number) {
		zoomed = { dataUrl, n };
		dialog?.showModal();
	}
</script>

{#if images.length > 0}
	<ul class="grid grid-cols-2 gap-3 sm:grid-cols-3">
		{#each images as image, i (image.id)}
			<li class="flex flex-col gap-1">
				<button
					class="overflow-hidden rounded-box border border-base-300 bg-base-100"
					onclick={() => zoom(image.dataUrl, i + 1)}
				>
					<img
						src={image.dataUrl}
						alt={alt(i + 1)}
						class="aspect-4/3 w-full object-cover"
						loading="lazy"
					/>
				</button>
				{#if canEdit}
					<button
						class="btn btn-soft btn-error btn-xs self-end"
						onclick={() => (deletingId = image.id)}
					>
						<Icon paths={UI_ICONS.trash} class="size-3.5" />
						{fr.common.delete}
					</button>
				{/if}
			</li>
		{/each}
	</ul>
{/if}
{#if canEdit && images.length < max}
	<label
		class={[
			'btn btn-ghost btn-sm self-start focus-within:outline-2 focus-within:outline-offset-2',
			busy && 'btn-disabled'
		]}
	>
		{#if busy}<span class="loading loading-spinner loading-sm"></span>
		{:else}<Icon paths={UI_ICONS.upload} class="size-4" />{/if}
		{addLabel}
		<input class="sr-only" type="file" accept="image/*" onchange={pick} disabled={busy} />
	</label>
{/if}
{#if error}<p role="alert" class="alert alert-error alert-soft">{error}</p>{/if}

<!-- The enlarged picture: tap anywhere (or Esc) to close. -->
<dialog bind:this={dialog} class="modal" onclose={() => (zoomed = null)}>
	<form method="dialog" class="modal-box max-w-5xl p-2">
		<button class="block w-full" aria-label={fr.common.close}>
			{#if zoomed}<img src={zoomed.dataUrl} alt={alt(zoomed.n)} class="h-auto w-full" />{/if}
		</button>
	</form>
	<form method="dialog" class="modal-backdrop"><button>{fr.common.close}</button></form>
</dialog>

{#if deletingId}
	{@const imageId = deletingId}
	<ConfirmDialog
		title={deleteTitle}
		confirmLabel={fr.common.delete}
		danger
		onconfirm={() => ondelete(imageId)}
		onclose={() => (deletingId = null)}
	/>
{/if}
