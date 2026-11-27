import { deleteDoc, setDoc } from 'firebase/firestore';
import { sectionImageSlots } from '#lib/import/sheetPlan.ts';
import { sectionImageRef, sectionImagesCol } from './refs.ts';
import { querySource } from './sources.ts';
import { inBackground } from './writes.ts';

// Pictures under the sections of a sheet (parent): at most MAX_SECTION_IMAGES per section, on
// the first MAX_SECTIONS_WITH_IMAGES sections, ids `section-<s>-<n>`. One document each (a
// picture is large): the sheet page reads them with one listener.

export { MAX_SECTION_IMAGES, MAX_SECTIONS_WITH_IMAGES } from '#lib/schemas/sheet.ts';

export const watchSectionImages = (familyId: string, conceptId: string) =>
	querySource(sectionImagesCol(familyId, conceptId));

/** Adds a picture to a section (1-based), in its first free slot (none when full). Offline. */
export function addSectionImage(
	familyId: string,
	conceptId: string,
	section: number,
	usedIds: string[],
	dataUrl: string
): void {
	const slots = sectionImageSlots(section);
	const slot = slots.findIndex((id) => !usedIds.includes(id));
	if (slot < 0) return;
	inBackground(
		setDoc(sectionImageRef(familyId, conceptId, slots[slot]), {
			dataUrl,
			section,
			order: slot + 1
		}),
		'section image added'
	);
}

export function deleteSectionImage(familyId: string, conceptId: string, imageId: string): void {
	inBackground(deleteDoc(sectionImageRef(familyId, conceptId, imageId)), 'section image deleted');
}
