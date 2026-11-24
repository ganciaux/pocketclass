import { flip } from 'svelte/animate';
import { cubicInOut, quintOut } from 'svelte/easing';
import { prefersReducedMotion } from 'svelte/motion';
import { fade, fly, slide } from 'svelte/transition';

/**
 * The app's motion, in one place (Svelte transitions; page transitions are CSS view
 * transitions in `app.css`). Strong ease-out to enter and leave, ease-in-out to move, exits
 * faster than entrances. With "reduce motion", nothing moves: short fades only.
 */

const reduced = () => prefersReducedMotion.current;

/** A list row added or removed (sheet, chapter, subject): fades while the gap opens or closes. */
export function row(node: Element, { exit = false }: { exit?: boolean } = {}) {
	if (reduced()) return fade(node, { duration: 120 });
	const collapse = slide(node, { duration: exit ? 200 : 260, easing: quintOut });
	return { ...collapse, css: (t: number, u: number) => `${collapse.css?.(t, u)}; opacity: ${t}` };
}

/** List rows changing places (↑ ↓): they glide to their new position. */
export function reorder(node: Element, fromTo: { from: DOMRect; to: DOMRect }) {
	return flip(node, fromTo, { duration: reduced() ? 0 : 250, easing: cubicInOut });
}

/** A toast rising from the bottom edge, and leaving the same way. */
export function toast(node: Element, { exit = false }: { exit?: boolean } = {}) {
	if (reduced()) return fade(node, { duration: 120 });
	return fly(node, { y: 24, duration: exit ? 180 : 280, easing: quintOut });
}
