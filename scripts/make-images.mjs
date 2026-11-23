// One-off: derives the app images from the logo (assets/logo.webp, 1024 px).
// - assets/icon.png: the pencil-rocket, source of the app icons. Then run
//   `npx pwa-assets-generator` (pwa-assets.config.ts) and move the files to static/.
// - src/lib/assets/logo.webp: the full logo at 640 px for the sign-in screen.
import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

await sharp('assets/logo.webp')
	.extract({ left: 545, top: 20, width: 320, height: 320 })
	.resize(512, 512, { kernel: 'lanczos3' })
	.png()
	.toFile('assets/icon.png');

await mkdir('src/lib/assets', { recursive: true });
await sharp('assets/logo.webp')
	.resize(640)
	.webp({ quality: 80 })
	.toFile('src/lib/assets/logo.webp');
