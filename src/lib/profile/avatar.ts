import { AVATAR_MAX_LENGTH, AVATAR_SIZE, centerSquare } from './display.ts';

export class AvatarTooLargeError extends Error {
	constructor() {
		super('Avatar too large');
	}
}

/**
 * Picked image → small square data URL stored in the profile (no Firebase Storage needed):
 * centre crop, resized to AVATAR_SIZE, WebP (JPEG if unsupported), quality lowered until it
 * fits AVATAR_MAX_LENGTH. Browser only (canvas).
 */
export async function imageFileToAvatar(file: Blob): Promise<string> {
	const bitmap = await createImageBitmap(file);
	const { x, y, size } = centerSquare(bitmap.width, bitmap.height);
	const canvas = document.createElement('canvas');
	canvas.width = canvas.height = AVATAR_SIZE;
	const context = canvas.getContext('2d');
	if (!context) throw new Error('Canvas 2D unavailable');
	context.drawImage(bitmap, x, y, size, size, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
	bitmap.close();

	for (const quality of [0.85, 0.7, 0.5]) {
		let url = canvas.toDataURL('image/webp', quality);
		// Browsers without WebP encoding fall back to PNG: use JPEG instead.
		if (!url.startsWith('data:image/webp')) url = canvas.toDataURL('image/jpeg', quality);
		if (url.length <= AVATAR_MAX_LENGTH) return url;
	}
	throw new AvatarTooLargeError();
}
