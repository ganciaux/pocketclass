import { deleteDoc, setDoc } from 'firebase/firestore';
import { MAP_IMAGE_SLOTS } from '#lib/import/sheetPlan.ts';
import { mapImageRef, mapImagesCol } from './refs.ts';
import { querySource } from './sources.ts';
import { inBackground } from './writes.ts';

// Pictures of a sheet's mind map (parent): at most MAX_MAP_IMAGES, ids `image-1`… Each one is
// its own document (a picture is large), read only on the mind map page.

export { MAX_MAP_IMAGES } from '#lib/schemas/sheet.ts';

export const watchMapImages = (familyId: string, conceptId: string) =>
	querySource(mapImagesCol(familyId, conceptId));

/** Adds a picture in the first free slot (none when full). Works offline. */
export function addMapImage(
	familyId: string,
	conceptId: string,
	usedIds: string[],
	dataUrl: string
): void {
	const slot = MAP_IMAGE_SLOTS.findIndex((id) => !usedIds.includes(id));
	if (slot < 0) return;
	const ref = mapImageRef(familyId, conceptId, MAP_IMAGE_SLOTS[slot]);
	inBackground(setDoc(ref, { dataUrl, order: slot + 1 }), 'map image added');
}

export function deleteMapImage(familyId: string, conceptId: string, imageId: string): void {
	inBackground(deleteDoc(mapImageRef(familyId, conceptId, imageId)), 'map image deleted');
}
