import { describe, expect, it } from 'vitest';
import { pathProgress, topicsOf } from './paths.ts';

const path = {
	id: 'p1',
	title: 'Brevet',
	topics: [
		{ id: 't2', title: 'Second', order: 1 },
		{ id: 't1', title: 'First', order: 0 }
	]
};
const concept = (id: string, topicId: string, order: number, pathId = 'p1') => ({
	id,
	title: id.toUpperCase(),
	pathId,
	topicId,
	order
});
const concepts = [
	concept('c3', 't2', 0),
	concept('c2', 't1', 1),
	concept('c1', 't1', 0),
	concept('x1', 't1', 0, 'other'),
	concept('lost', 'unknown', 0)
];

describe('topicsOf', () => {
	it('orders topics and their concepts, keeping only this path', () => {
		const topics = topicsOf(path, concepts);
		expect(topics.map((t) => t.id)).toEqual(['t1', 't2']);
		expect(topics[0].concepts.map((c) => c.id)).toEqual(['c1', 'c2']);
		expect(topics[1].concepts.map((c) => c.id)).toEqual(['c3']);
	});
});

describe('pathProgress', () => {
	it('counts read concepts and points to the first unread one in map order', () => {
		expect(pathProgress([path], concepts, new Set(['c1', 'x1']))).toEqual([
			{ pathId: 'p1', title: 'Brevet', total: 3, read: 1, next: { id: 'c2', title: 'C2' } }
		]);
	});

	it('has no next concept once everything is read', () => {
		const [progress] = pathProgress([path], concepts, new Set(['c1', 'c2', 'c3']));
		expect(progress.read).toBe(3);
		expect(progress.next).toBeNull();
	});
});
