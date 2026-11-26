import { describe, expect, it, vi } from 'vitest';
import { inBackground, onWriteFailure, type WriteFailure } from './writes.ts';

describe('inBackground', () => {
	it('reports a failed write to the listeners, with its code', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const seen: WriteFailure[] = [];
		const stop = onWriteFailure((failure) => seen.push(failure));
		inBackground(Promise.reject({ code: 'permission-denied' }), 'practice series');
		inBackground(Promise.resolve(), 'sheet read');
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(seen).toEqual([{ label: 'practice series', code: 'permission-denied' }]);

		stop();
		inBackground(Promise.reject(new Error('x')), 'note');
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(seen).toHaveLength(1);
	});
});
