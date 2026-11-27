import { describe, expect, it } from 'vitest';
import { dropIndex } from './sortable.ts';

describe('dropIndex', () => {
	// Rows 40 px high, 10 px apart: centres at 20, 70, 120, 170.
	const centers = [20, 70, 120, 170];

	it('stays in place until the row passes the next centre', () => {
		expect(dropIndex(centers, 1, 70)).toBe(1);
		expect(dropIndex(centers, 1, 115)).toBe(1);
		expect(dropIndex(centers, 1, 25)).toBe(1);
	});

	it('goes down or up several rows', () => {
		expect(dropIndex(centers, 0, 125)).toBe(2);
		expect(dropIndex(centers, 0, 500)).toBe(3);
		expect(dropIndex(centers, 3, 65)).toBe(1);
		expect(dropIndex(centers, 3, -100)).toBe(0);
	});
});
