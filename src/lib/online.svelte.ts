/** Browser connectivity, shared by the whole app (offline badge, offline-aware buttons). */
class Connectivity {
	online = $state(typeof navigator === 'undefined' ? true : navigator.onLine);

	constructor() {
		if (typeof window === 'undefined') return;
		window.addEventListener('online', () => (this.online = true));
		window.addEventListener('offline', () => (this.online = false));
	}
}

export const connectivity = new Connectivity();
