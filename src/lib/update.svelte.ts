import { registerSW } from 'virtual:pwa-register';

/** How often an open app asks the server for a new version (a PWA is rarely closed). */
const CHECK_EVERY_MS = 60 * 60 * 1000;
/** At most one check per this delay when the app comes back to the foreground. */
const MIN_CHECK_GAP_MS = 5 * 60 * 1000;
/** Reload anyway if the new version never reports taking control. */
const RELOAD_FALLBACK_MS = 3000;

/**
 * App updates (service worker, `registerType: 'prompt'`). A new version is downloaded in the
 * background, then waits: `available` turns true and the user chooses when to reload, so a
 * child is never interrupted in the middle of a sheet. Call `start()` once (root layout).
 *
 * Phones rarely close an installed app: they suspend it (timers stop) and resume it without a
 * reload. So the app also checks when it comes back to the foreground or online, and offers a
 * version that is still waiting again (after « Plus tard », or found while in the background).
 */
class AppUpdate {
	available = $state(false);
	#apply: (() => Promise<void>) | null = null;
	#registration: ServiceWorkerRegistration | null = null;
	#lastCheck = 0;

	start(): void {
		if (this.#apply) return;
		this.#apply = registerSW({
			immediate: true,
			onNeedRefresh: () => (this.available = true),
			onRegisterError: (error) => console.error('[sw] registration failed', error),
			onRegisteredSW: (_url, registration) => {
				if (!registration) return;
				this.#registration = registration;
				this.#lastCheck = Date.now();
				setInterval(() => this.check(true), CHECK_EVERY_MS);
				document.addEventListener('visibilitychange', () => {
					if (document.visibilityState === 'visible') this.check();
				});
				window.addEventListener('online', () => this.check());
			}
		});
	}

	/** Offers a version already waiting, then asks the server for a newer one (throttled). */
	check(force = false): void {
		const registration = this.#registration;
		if (!registration) return;
		if (registration.waiting) this.available = true;
		if (!force && Date.now() - this.#lastCheck < MIN_CHECK_GAP_MS) return;
		this.#lastCheck = Date.now();
		registration.update().catch(() => {});
	}

	/**
	 * Activates the waiting version and reloads the page. The plugin only reloads when the new
	 * version was installed by this page (`isUpdate`), not when it was found at launch, by the
	 * hourly check or by another tab: we reload ourselves once it takes control, with a timeout
	 * in case it already did (activated from another tab).
	 */
	async apply(): Promise<void> {
		let reloading = false;
		const reload = () => {
			if (reloading) return;
			reloading = true;
			window.location.reload();
		};
		navigator.serviceWorker?.addEventListener('controllerchange', reload, { once: true });
		setTimeout(reload, RELOAD_FALLBACK_MS);
		await this.#apply?.();
	}

	/**
	 * Later: the new version starts the next time the app is opened, and is offered again when
	 * the app comes back to the foreground.
	 */
	dismiss(): void {
		this.available = false;
	}
}

export const appUpdate = new AppUpdate();
