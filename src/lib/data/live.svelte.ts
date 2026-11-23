import type { Subscribe } from './sources.ts';

/**
 * Reactive live data for components, on top of the `Subscribe` sources of the data layer.
 * Call during component initialisation: the subscription follows the component lifecycle and
 * restarts when the reactive values read in `source` change. Read primitives only (ids), so it
 * does not restart on every keystroke.
 *
 *   const concept = live(() => session.familyId && watchConcept(session.familyId, id));
 *   concept.status // 'loading' | 'ready' | 'missing' | 'error'
 *   concept.data   // the value once 'ready'
 */
export type LoadStatus = 'loading' | 'ready' | 'missing' | 'error';

export interface Live<T> {
	readonly data: T | null;
	readonly status: LoadStatus;
}

/** What `&&` chains return while an input is missing: `familyId && id && watchX(...)`. */
type Falsy = null | undefined | false | '';

/** `source` returns a falsy value while its inputs are not available (e.g. no family yet). */
export function live<T>(source: () => Subscribe<T | null> | Falsy): Live<T> {
	let data = $state<T | null>(null);
	let status = $state<LoadStatus>('loading');

	// `.pre`: runs before the DOM update, so a new source (e.g. /concept/a → /concept/b) never
	// renders a frame with the previous source's data.
	$effect.pre(() => {
		const subscribe = source();
		// Reset first: never show the previous source's data while the new one loads.
		data = null;
		status = 'loading';
		if (!subscribe) return;
		return subscribe(
			(value) => {
				data = value;
				status = value === null ? 'missing' : 'ready';
			},
			(error) => {
				console.error('[live]', error);
				status = 'error';
			}
		);
	});

	return {
		get data() {
			return data;
		},
		get status() {
			return status;
		}
	};
}
