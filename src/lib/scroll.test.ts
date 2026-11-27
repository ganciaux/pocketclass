import { describe, expect, it } from 'vitest';
import { scrollProgress } from './scroll.ts';

describe('scrollProgress', () => {
	it('hides near the top and on short pages', () => {
		expect(scrollProgress(100, 800, 3000)).toBeNull();
		expect(scrollProgress(500, 800, 1100)).toBeNull();
	});

	it('gives the part of the page read, in percent', () => {
		expect(scrollProgress(1100, 800, 3000)).toBe(50);
		expect(scrollProgress(2200, 800, 3000)).toBe(100);
		// Overscroll (iOS bounce) stays at 100.
		expect(scrollProgress(2400, 800, 3000)).toBe(100);
	});
});
