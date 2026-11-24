import { registerSW } from 'virtual:pwa-register';

/** How often an open app asks the server for a new version (a PWA is rarely closed). */
const CHECK_EVERY_MS = 60 * 60 * 1000;

/**
 * App updates (service worker, `registerType: 'prompt'`). A new version is downloaded in the
 * background, then waits: `available` turns true and the user chooses when to reload, so a
 * child is never interrupted in the middle of a sheet. Call `start()` once (root layout).
 */
class AppUpdate {
	available = $state(false);
	#apply: ((reload?: boolean) => Promise<void>) | null = null;

	start(): void {
		if (this.#apply) return;
		this.#apply = registerSW({
			immediate: true,
			onNeedRefresh: () => (this.available = true),
			onRegisterError: (error) => console.error('[sw] registration failed', error),
			onRegisteredSW: (_url, registration) => {
				if (!registration) return;
				setInterval(() => registration.update().catch(() => {}), CHECK_EVERY_MS);
			}
		});
	}

	/** Activates the waiting version and reloads the page. */
	async apply(): Promise<void> {
		await this.#apply?.(true);
	}

	/** Later: the new version then starts the next time the app is opened. */
	dismiss(): void {
		this.available = false;
	}
}

export const appUpdate = new AppUpdate();
