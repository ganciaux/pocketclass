<script lang="ts">
	import PictureStrip from '#lib/components/PictureStrip.svelte';
	import { live } from '#lib/data/live.svelte.ts';
	import {
		addMapImage,
		deleteMapImage,
		MAX_MAP_IMAGES,
		watchMapImages
	} from '#lib/data/mapImages.ts';
	import { fr } from '#lib/i18n/fr.ts';

	/**
	 * Pictures of a sheet's mind map, under the drawn map: tap to enlarge. The parent (`canEdit`)
	 * adds up to MAX_MAP_IMAGES (scaled down to WebP) and deletes them.
	 */
	let { familyId, conceptId, canEdit }: { familyId: string; conceptId: string; canEdit: boolean } =
		$props();

	const t = fr.mindMap;
	const imagesLive = live(() => watchMapImages(familyId, conceptId));
	const images = $derived([...(imagesLive.data ?? [])].sort((a, b) => a.order - b.order));
</script>

{#if images.length > 0 || canEdit}
	<section class="flex flex-col gap-2">
		<h2>{t.imagesTitle}</h2>
		<PictureStrip
			{images}
			max={MAX_MAP_IMAGES}
			{canEdit}
			addLabel={t.addImage}
			alt={t.imageAlt}
			deleteTitle={t.deleteImage}
			onadd={(dataUrl) =>
				addMapImage(
					familyId,
					conceptId,
					images.map((i) => i.id),
					dataUrl
				)}
			ondelete={(id) => deleteMapImage(familyId, conceptId, id)}
		/>
		{#if canEdit}
			<p class="text-sm text-base-content/60">{t.imagesHelp(MAX_MAP_IMAGES)}</p>
		{/if}
	</section>
{/if}
