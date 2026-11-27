/** Scrolled at least this far before « back to the top » shows. */
export const SCROLL_TOP_FROM = 400;

/**
 * How much of the page was read (0–100), or null when « back to the top » should not show:
 * near the top, or a page barely longer than the screen. Pure (unit-tested).
 */
export function scrollProgress(
	scrollY: number,
	viewportHeight: number,
	pageHeight: number
): number | null {
	const scrollable = pageHeight - viewportHeight;
	if (scrollable < SCROLL_TOP_FROM || scrollY < SCROLL_TOP_FROM) return null;
	return Math.min(100, Math.max(0, Math.round((scrollY / scrollable) * 100)));
}
