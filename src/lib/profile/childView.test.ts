import { describe, expect, it } from 'vitest';
import type { Profile, WithId } from '#lib/data/types.ts';
import { childViewOf } from './childView.ts';

const profile = (id: string, fields: Partial<Profile>): WithId<Profile> => ({
	id,
	firstName: id,
	role: 'child',
	grade: null,
	points: 0,
	...fields
});

const lea = profile('lea', {
	firstName: 'Léa',
	nickname: 'Lélé',
	grade: '6e',
	extraSubjects: ['maths-3e']
});
const tom = profile('tom', { firstName: 'Tom', grade: '3e' });
const alice = profile('alice', { firstName: 'Alice', role: 'admin' });

describe('childViewOf', () => {
	it('a child always gets their own view', () => {
		expect(childViewOf(lea, tom)).toEqual({
			ownerId: 'lea',
			grade: '6e',
			extraSubjects: ['maths-3e'],
			name: 'Lélé',
			testing: false
		});
	});

	it('a parent without a test child has no child view', () => {
		expect(childViewOf(alice, null)).toBeNull();
	});

	it("a parent testing sees the child's binder but owns the data", () => {
		expect(childViewOf(alice, tom)).toEqual({
			ownerId: 'alice',
			grade: '3e',
			extraSubjects: [],
			name: 'Tom',
			testing: true
		});
	});

	it('only a child profile can be imitated', () => {
		expect(childViewOf(alice, profile('bob', { role: 'admin' }))).toBeNull();
	});

	it('no profile, no view', () => {
		expect(childViewOf(null, tom)).toBeNull();
	});
});
