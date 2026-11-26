/**
 * The current time, refreshed every `intervalMs` (countdowns such as the revision hourglass).
 * Call it while a component initialises: the timer stops with the component.
 */
export function ticking(intervalMs = 30_000): { readonly now: number } {
	let now = $state(Date.now());
	$effect(() => {
		const id = setInterval(() => (now = Date.now()), intervalMs);
		return () => clearInterval(id);
	});
	return {
		get now() {
			return now;
		}
	};
}
