import { defineConfig } from '@vite-pwa/assets-generator/config';

// App icons from assets/icon.png (pencil-rocket cropped from the logo: scripts/make-icon.mjs).
// Full-bleed artwork: no padding; dark background matching the logo.
export default defineConfig({
	headLinkOptions: { preset: '2023' },
	preset: {
		transparent: { sizes: [64, 192, 512], favicons: [[48, 'favicon.ico']], padding: 0 },
		maskable: { sizes: [512], padding: 0, resizeOptions: { background: '#1a1b20' } },
		apple: { sizes: [180], padding: 0, resizeOptions: { background: '#1a1b20' } }
	},
	images: ['assets/icon.png']
});
