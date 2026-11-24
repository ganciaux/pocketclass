import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-static';
import { withPwa } from '@vite-pwa/sveltekit';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	build: {
		rolldownOptions: {
			output: {
				// Big libraries in their own chunks: their file names (content hashes) do not change
				// when our code does, so a deploy does not make phones download them again.
				codeSplitting: {
					groups: [
						{ name: 'firebase', test: /node_modules[\\/](@firebase|firebase)[\\/]/ },
						{ name: 'markdown', test: /node_modules[\\/](katex|marked|dompurify)[\\/]/ }
					]
				}
			}
		}
	},
	plugins: [
		tailwindcss(),
		// withPwa wraps the sveltekit() plugin (first argument = SvelteKit options).
		withPwa(
			{
				compilerOptions: {
					// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
					runes: ({ filename }) =>
						filename.split(/[/\\]/).includes('node_modules') ? undefined : true
				},
				adapter: adapter({ fallback: 'index.html' })
			},
			{
				strategies: 'generateSW',
				// A new version waits until the user accepts it (src/lib/update.svelte.ts).
				registerType: 'prompt',
				// Registered from the root layout with `virtual:pwa-register`.
				injectRegister: false,
				// Absolute: Kit's relative base would register `./sw.js` from the current page, so an app
				// opened on /concept/x looked for /concept/sw.js and silently had no service worker.
				base: '/',
				buildBase: '/',
				scope: '/',
				kit: { adapterFallback: 'index.html', spa: true },
				manifest: {
					name: 'PocketClass — Fiches de révision',
					short_name: 'PocketClass',
					description: 'Tes fiches de révision, dans la poche.',
					lang: 'fr',
					start_url: '/',
					scope: '/',
					display: 'standalone',
					orientation: 'portrait',
					background_color: '#1c1d22',
					theme_color: '#1c1d22',
					icons: [
						{ src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
						{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
						{ src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
						{
							src: 'maskable-icon-512x512.png',
							sizes: '512x512',
							type: 'image/png',
							purpose: 'maskable'
						}
					]
				},
				generateSW: {
					// App shell: JS, CSS, fonts (KaTeX, Atkinson, Permanent Marker), icons, logo, sample path.
					globPatterns: ['client/**/*.{js,css,ico,png,svg,webp,woff2,webmanifest,json}'],
					globIgnores: ['client/schemas/**'],
					// The plugin always adds `prerendered/**`, which is empty in a pure SPA.
					// The SPA fallback (index.html) is precached through `kit.spa`.
					globStrict: false
				}
			}
		)
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			},
			{
				// Firestore security rules, against the emulator: npm run test:rules
				extends: './vite.config.ts',
				test: {
					name: 'rules',
					environment: 'node',
					include: ['tests/rules/**/*.test.ts'],
					// assertSucceeds / assertFails are not Vitest `expect` assertions.
					expect: { requireAssertions: false }
				}
			}
		]
	}
});
