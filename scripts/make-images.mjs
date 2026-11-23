// One-off: crops the pencil-rocket of assets/logo.webp into assets/icon.png (512 px source of
// the app icons). Then: npx pwa-assets-generator (pwa-assets.config.ts) and copy to static/.
import sharp from 'sharp';

await sharp('assets/logo.webp')
	.extract({ left: 545, top: 20, width: 320, height: 320 })
	.resize(512, 512, { kernel: 'lanczos3' })
	.png()
	.toFile('assets/icon.png');
