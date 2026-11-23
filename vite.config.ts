import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-static';
import { withPwa } from '@vite-pwa/sveltekit';

export default defineConfig({
	plugins: [
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
				registerType: 'autoUpdate',
				// Registered from the root layout with `virtual:pwa-register`.
				injectRegister: false,
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
					background_color: '#f6f7fb',
					theme_color: '#4f46e5',
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
					// App shell: JS, CSS, fonts (KaTeX), icons and the sample path.
					globPatterns: ['client/**/*.{js,css,ico,png,svg,woff2,webmanifest,json}'],
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
