/**
 * Drag and drop to reorder a list, with a mouse or a finger. Pointer events, not the HTML drag
 * and drop API (which does nothing on phones). No library.
 *
 * - Rows are the list's children marked `data-sort-item`; a row is picked up by its handle
 *   `[data-drag-handle]` only (`<DragHandle>`), so the rest of the row stays a link.
 * - While dragging, rows only move on screen (CSS transforms): the dragged row follows the
 *   pointer, the others make room.
 * - On drop, `onsort(from, to)` runs. The transforms stay until the list shows the new order
 *   (`order` changes, or after a short delay), so nothing jumps back while it is saved; the
 *   `reorder` glide (motion.ts) is skipped for that update (`data-dropped` on the list).
 *
 * The ↑ ↓ buttons stay next to it: keyboard and screen reader users reorder with them.
 */

export interface SortableOptions {
	/** The current order, as a string (e.g. the ids joined): tells when the list was updated. */
	order: string;
	onsort: (from: number, to: number) => void;
	disabled?: boolean;
}

/**
 * Where the dragged row lands: `centers` are the rows' vertical centres when it was picked up,
 * `y` the dragged row's centre now. Pure (unit-tested).
 */
export function dropIndex(centers: number[], from: number, y: number): number {
	let to = from;
	while (to < centers.length - 1 && y > centers[to + 1]) to++;
	while (to > 0 && y < centers[to - 1]) to--;
	return to;
}

/** Leaves the dropped order on screen at most this long if the list never updates. */
const SETTLE_MS = 1500;

interface Drag {
	pointerId: number;
	rows: HTMLElement[];
	rects: DOMRect[];
	from: number;
	to: number;
	startY: number;
	/** How far the other rows move to make room: the dragged row's height plus the gap. */
	room: number;
}

export function sortable(list: HTMLElement, options: SortableOptions) {
	let current = options;
	let drag: Drag | null = null;
	let settling: { order: string; timer: ReturnType<typeof setTimeout> } | null = null;

	const rowsOf = () =>
		[...list.children].filter(
			(el): el is HTMLElement => el instanceof HTMLElement && 'sortItem' in el.dataset
		);

	function clear() {
		if (settling) clearTimeout(settling.timer);
		settling = null;
		for (const row of rowsOf()) {
			row.style.transform = '';
			row.style.transition = '';
			row.classList.remove('sort-dragging');
		}
		list.classList.remove('sort-active');
		// After the keyed list's own update (its `reorder` reads the flag).
		requestAnimationFrame(() => delete list.dataset.dropped);
	}

	function down(event: PointerEvent) {
		if (current.disabled || drag || settling || event.button !== 0) return;
		const handle = (event.target as Element | null)?.closest('[data-drag-handle]');
		const row = handle?.closest<HTMLElement>('[data-sort-item]');
		if (!handle || !row || row.parentElement !== list) return;
		const rows = rowsOf();
		const from = rows.indexOf(row);
		if (from < 0 || rows.length < 2) return;
		event.preventDefault();
		handle.setPointerCapture(event.pointerId);
		const rects = rows.map((r) => r.getBoundingClientRect());
		const gap = rects[1].top - rects[0].bottom;
		drag = {
			pointerId: event.pointerId,
			rows,
			rects,
			from,
			to: from,
			startY: event.clientY,
			room: rects[from].height + gap
		};
		row.classList.add('sort-dragging');
		list.classList.add('sort-active');
	}

	function move(event: PointerEvent) {
		if (!drag || event.pointerId !== drag.pointerId) return;
		const { rows, rects, from, room } = drag;
		const dy = event.clientY - drag.startY;
		const centers = rects.map((r) => r.top + r.height / 2);
		const to = dropIndex(centers, from, centers[from] + dy);
		drag.to = to;
		rows[from].style.transform = `translateY(${dy}px)`;
		rows.forEach((row, k) => {
			if (k === from) return;
			const shift = from < k && k <= to ? -room : to <= k && k < from ? room : 0;
			row.style.transform = shift ? `translateY(${shift}px)` : '';
		});
	}

	function up(event: PointerEvent) {
		if (!drag || event.pointerId !== drag.pointerId) return;
		const { rows, rects, from, to } = drag;
		drag = null;
		if (event.type === 'pointercancel' || to === from) {
			clear();
			return;
		}
		// The dragged row settles exactly in its new place, then the list takes the new order.
		const offset =
			to > from ? rects[to].bottom - rects[from].bottom : rects[to].top - rects[from].top;
		rows[from].style.transition = 'transform 120ms ease-out';
		rows[from].style.transform = `translateY(${offset}px)`;
		list.dataset.dropped = '';
		settling = { order: current.order, timer: setTimeout(clear, SETTLE_MS) };
		current.onsort(from, to);
	}

	list.addEventListener('pointerdown', down);
	list.addEventListener('pointermove', move);
	list.addEventListener('pointerup', up);
	list.addEventListener('pointercancel', up);

	return {
		update(next: SortableOptions) {
			current = next;
			if (settling && next.order !== settling.order) clear();
		},
		destroy() {
			if (settling) clearTimeout(settling.timer);
			list.removeEventListener('pointerdown', down);
			list.removeEventListener('pointermove', move);
			list.removeEventListener('pointerup', up);
			list.removeEventListener('pointercancel', up);
		}
	};
}
