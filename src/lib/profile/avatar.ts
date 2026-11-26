import { MAP_IMAGE_MAX_LENGTH } from '#lib/schemas/sheet.ts';
import { AVATAR_MAX_LENGTH, AVATAR_SIZE, centerSquare } from './display.ts';

export class ImageTooLargeError extends Error {
	constructor() {
		super('Image too large');
	}
}

/** Largest side of a mind map picture (its data URL budget is in the sheet schema). */
const PICTURE_MAX_SIDE = 1200;

/**
 * Canvas → data URL: WebP (JPEG if unsupported), quality lowered until it fits `maxLength`.
 * Throws `ImageTooLargeError` when even the lowest quality is too large.
 */
function encode(canvas: HTMLCanvasElement, maxLength: number, qualities: number[]): string {
	for (const quality of qualities) {
		let url = canvas.toDataURL('image/webp', quality);
		// Browsers without WebP encoding fall back to PNG: use JPEG instead.
		if (!url.startsWith('data:image/webp')) url = canvas.toDataURL('image/jpeg', quality);
		if (url.length <= maxLength) return url;
	}
	throw new ImageTooLargeError();
}

function canvasOf(width: number, height: number) {
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const context = canvas.getContext('2d');
	if (!context) throw new Error('Canvas 2D unavailable');
	return { canvas, context };
}

/**
 * Picked image → small square data URL stored in the profile (no Firebase Storage needed):
 * centre crop, resized to AVATAR_SIZE. Browser only (canvas).
 */
export async function imageFileToAvatar(file: Blob): Promise<string> {
	const bitmap = await createImageBitmap(file);
	const { x, y, size } = centerSquare(bitmap.width, bitmap.height);
	const { canvas, context } = canvasOf(AVATAR_SIZE, AVATAR_SIZE);
	context.drawImage(bitmap, x, y, size, size, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
	bitmap.close();
	return encode(canvas, AVATAR_MAX_LENGTH, [0.85, 0.7, 0.5]);
}

/**
 * Picked image → data URL of a whole picture (a photo of a mind map): scaled down to
 * PICTURE_MAX_SIDE (never up), then MAP_IMAGE_MAX_LENGTH. Browser only (canvas).
 */
export async function imageFileToPicture(file: Blob): Promise<string> {
	const bitmap = await createImageBitmap(file);
	const scale = Math.min(1, PICTURE_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
	const width = Math.round(bitmap.width * scale);
	const height = Math.round(bitmap.height * scale);
	const { canvas, context } = canvasOf(width, height);
	// A white page under transparent PNGs (JPEG fallback has no alpha).
	context.fillStyle = '#fff';
	context.fillRect(0, 0, width, height);
	context.drawImage(bitmap, 0, 0, width, height);
	bitmap.close();
	return encode(canvas, MAP_IMAGE_MAX_LENGTH, [0.8, 0.65, 0.5, 0.35]);
}
