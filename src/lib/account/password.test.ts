import { describe, expect, it } from 'vitest';
import { authErrorKey, passwordProblem } from './password.ts';

describe('passwordProblem', () => {
	it('needs at least 8 characters', () => {
		expect(passwordProblem('abc', 'abc')).toBe('tooShort');
	});

	it('needs the confirmation to match', () => {
		expect(passwordProblem('abcdefgh', 'abcdefgx')).toBe('mismatch');
	});

	it('accepts a long enough, confirmed password', () => {
		expect(passwordProblem('abcdefgh', 'abcdefgh')).toBeNull();
	});
});

describe('authErrorKey', () => {
	it('maps Firebase codes to messages', () => {
		const cases: [string | undefined, string][] = [
			['auth/invalid-credential', 'wrongCredentials'],
			['auth/wrong-password', 'wrongCredentials'],
			['auth/user-not-found', 'wrongCredentials'],
			['auth/too-many-requests', 'tooManyRequests'],
			['auth/network-request-failed', 'offline'],
			['auth/weak-password', 'weakPassword'],
			['auth/credential-already-in-use', 'alreadyUsed'],
			['auth/email-already-in-use', 'alreadyUsed'],
			['auth/invalid-email', 'invalidEmail'],
			['auth/missing-email', 'invalidEmail'],
			['auth/popup-closed-by-user', 'popupClosed'],
			['auth/cancelled-popup-request', 'popupClosed'],
			[undefined, 'generic'],
			['auth/whatever', 'generic']
		];
		for (const [code, key] of cases) expect(authErrorKey(code), String(code)).toBe(key);
	});
});
