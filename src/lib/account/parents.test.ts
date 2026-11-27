import { describe, expect, it } from 'vitest';
import { canRemoveParent, inviteEmail } from './parents.ts';

describe('inviteEmail', () => {
	it('trims and lowers an e-mail', () => {
		expect(inviteEmail('  Marie.Durand@Gmail.com ')).toBe('marie.durand@gmail.com');
	});

	it('rejects what is not an e-mail', () => {
		expect(inviteEmail('')).toBeNull();
		expect(inviteEmail('marie')).toBeNull();
		expect(inviteEmail('marie@gmail')).toBeNull();
		expect(inviteEmail('ma rie@gmail.com')).toBeNull();
	});
});

describe('canRemoveParent', () => {
	it('removes a co-parent', () => {
		expect(canRemoveParent('alice', ['alice', 'bob'], 'bob')).toBe(true);
	});

	it('keeps the parent who created the family', () => {
		expect(canRemoveParent('alice', ['alice', 'bob'], 'alice')).toBe(false);
	});

	it('keeps the last admin (an older family with an automatic id)', () => {
		expect(canRemoveParent('f123', ['bob'], 'bob')).toBe(false);
		expect(canRemoveParent('f123', ['bob', 'carol'], 'bob')).toBe(true);
	});

	it('ignores someone who is not an admin', () => {
		expect(canRemoveParent('alice', ['alice', 'bob'], 'carol')).toBe(false);
	});
});
