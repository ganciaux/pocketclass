// One-off: builds the app images. Run with `node scripts/make-images.mjs`.
// - static/ icons: one artwork per size range (assets/icon-*.png, square, dark background):
//   large (book + rocket in a splash circle) for 512 px, medium (no splash) for 180–192 px,
//   small (rocket + book only) for 64 px and the favicon.
// - src/lib/assets/logo.webp: the full logo (assets/logo.webp, 1024 px) at 640 px for the
//   sign-in screen.
import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const BACKGROUND = '#161b1c'; // background of the icon artworks

/** @param {string} source @param {number} size @param {number} [padding] fraction per side */
const png = (source, size, padding = 0) => {
	const inner = Math.round(size * (1 - 2 * padding));
	const margin = (size - inner) / 2;
	return sharp(source)
		.resize(inner, inner, { kernel: 'lanczos3' })
		.extend({
			top: Math.floor(margin),
			bottom: Math.ceil(margin),
			left: Math.floor(margin),
			right: Math.ceil(margin),
			background: BACKGROUND
		})
		.png()
		.toBuffer();
};

// ICO file holding a single PNG image (supported by every current browser).
/** @param {Buffer} pngData @param {number} size */
const ico = (pngData, size) => {
	const header = Buffer.alloc(22);
	header.writeUInt16LE(0, 0); // reserved
	header.writeUInt16LE(1, 2); // type: icon
	header.writeUInt16LE(1, 4); // one image
	header.writeUInt8(size, 6); // width
	header.writeUInt8(size, 7); // height
	header.writeUInt16LE(1, 10); // colour planes
	header.writeUInt16LE(32, 12); // bits per pixel
	header.writeUInt32LE(pngData.length, 14);
	header.writeUInt32LE(22, 18); // image offset
	return Buffer.concat([header, pngData]);
};

const large = 'assets/icon-large.png';
const medium = 'assets/icon-medium.png';
const small = 'assets/icon-small.png';

await writeFile('static/pwa-512x512.png', await png(large, 512));
// Maskable: Android crops to a circle (safe zone = 80 % of the size), keep the splash circle in.
await writeFile('static/maskable-icon-512x512.png', await png(large, 512, 0.08));
await writeFile('static/pwa-192x192.png', await png(medium, 192));
await writeFile('static/apple-touch-icon-180x180.png', await png(medium, 180));
await writeFile('static/pwa-64x64.png', await png(small, 64));
await writeFile('static/favicon.ico', ico(await png(small, 48), 48));

await mkdir('src/lib/assets', { recursive: true });
await sharp('assets/logo.webp')
	.resize(640)
	.webp({ quality: 80 })
	.toFile('src/lib/assets/logo.webp');
