<script lang="ts">
	import { UI_ICONS } from '#lib/binder/icons.ts';
	import ConfirmDialog from '#lib/components/ConfirmDialog.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { live } from '#lib/data/live.svelte.ts';
	import {
		addMapImage,
		deleteMapImage,
		MAX_MAP_IMAGES,
		watchMapImages
	} from '#lib/data/mapImages.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { AvatarTooLargeError, imageFileToPicture } from '#lib/profile/avatar.ts';

	/**
	 * Pictures of a sheet's mind map, under the drawn map: tap to enlarge. The parent (`canEdit`)
	 * adds up to MAX_MAP_IMAGES (scaled down to WebP) and deletes them.
	 */
	let { familyId, conceptId, canEdit }: { familyId: string; conceptId: string; canEdit: boolean } =
		$props();

	const t = fr.mindMap;
	const imagesLive = live(() => watchMapImages(familyId, conceptId));
	const images = $derived([...(imagesLive.data ?? [])].sort((a, b) => a.order - b.order));

	let busy = $state(false);
	let error = $state<string | null>(null);
	let zoomed = $state<string | null>(null);
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
			const dataUrl = await imageFileToPicture(file);
			addMapImage(
				familyId,
				conceptId,
				images.map((i) => i.id),
				dataUrl
			);
		} catch (failure) {
			console.error('[map image]', failure);
			error = failure instanceof AvatarTooLargeError ? t.imageTooLarge : fr.look.imageFailed;
		} finally {
			busy = false;
		}
	}

	function zoom(dataUrl: string) {
		zoomed = dataUrl;
		dialog?.showModal();
	}
</script>

{#if images.length > 0 || canEdit}
	<section class="flex flex-col gap-2">
		<h2>{t.imagesTitle}</h2>
		{#if images.length > 0}
			<ul class="grid grid-cols-2 gap-3 sm:grid-cols-3">
				{#each images as image, i (image.id)}
					<li class="flex flex-col gap-1">
						<button
							class="overflow-hidden rounded-box border border-base-300 bg-base-100"
							onclick={() => zoom(image.dataUrl)}
						>
							<img
								src={image.dataUrl}
								alt={t.imageAlt(i + 1)}
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
		{#if canEdit}
			{#if images.length < MAX_MAP_IMAGES}
				<label class={['btn btn-soft btn-primary btn-sm self-start', busy && 'btn-disabled']}>
					{#if busy}<span class="loading loading-spinner loading-sm"></span>
					{:else}<Icon paths={UI_ICONS.upload} class="size-4" />{/if}
					{t.addImage}
					<input class="hidden" type="file" accept="image/*" onchange={pick} disabled={busy} />
				</label>
			{/if}
			<p class="text-sm text-base-content/60">{t.imagesHelp(MAX_MAP_IMAGES)}</p>
			{#if error}<p role="alert" class="alert alert-error alert-soft">{error}</p>{/if}
		{/if}
	</section>
{/if}

<!-- The enlarged picture: tap anywhere (or Esc) to close. -->
<dialog bind:this={dialog} class="modal" onclose={() => (zoomed = null)}>
	<form method="dialog" class="modal-box max-w-5xl p-2">
		<button class="block w-full" aria-label={fr.common.close}>
			{#if zoomed}<img src={zoomed} alt={t.imageAlt(0)} class="h-auto w-full" />{/if}
		</button>
	</form>
	<form method="dialog" class="modal-backdrop"><button>{fr.common.close}</button></form>
</dialog>

{#if deletingId}
	{@const imageId = deletingId}
	<ConfirmDialog
		title={t.deleteImage}
		confirmLabel={fr.common.delete}
		danger
		onconfirm={() => deleteMapImage(familyId, conceptId, imageId)}
		onclose={() => (deletingId = null)}
	/>
{/if}
