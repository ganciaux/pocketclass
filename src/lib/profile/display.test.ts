import { describe, expect, it } from 'vitest';
import { centerSquare, displayName, initialOf } from './display.ts';

describe('displayName', () => {
	it('prefers the nickname, falls back to the first name', () => {
		expect(displayName({ firstName: 'Léa', nickname: 'Lélé' })).toBe('Lélé');
		expect(displayName({ firstName: 'Léa', nickname: '  ' })).toBe('Léa');
		expect(displayName({ firstName: 'Léa' })).toBe('Léa');
	});
});

it('initialOf returns an upper-case letter', () => {
	expect(initialOf('élodie')).toBe('É');
	expect(initialOf('')).toBe('?');
});

it('centerSquare crops the largest centred square', () => {
	expect(centerSquare(400, 300)).toEqual({ x: 50, y: 0, size: 300 });
	expect(centerSquare(300, 400)).toEqual({ x: 0, y: 50, size: 300 });
});
