// Firestore security rules tests. Run with the emulator: `npm run test:rules`.
import { readFileSync } from 'node:fs';
import {
	assertFails,
	assertSucceeds,
	initializeTestEnvironment,
	type RulesTestEnvironment
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let env: RulesTestEnvironment;

// Family of the parent "alice" (id = her uid). "kid-phone" is a device linked to profile "lea".
const FAMILY = 'alice';

const as = (uid: string) => env.authenticatedContext(uid).firestore();
const anonymous = () => env.unauthenticatedContext().firestore();
const at = (db: ReturnType<typeof as>, path: string) => doc(db, path);

beforeAll(async () => {
	env = await initializeTestEnvironment({
		projectId: 'pocketclass-bd866',
		firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 }
	});
});

afterAll(() => env.cleanup());

beforeEach(async () => {
	await env.clearFirestore();
	await env.withSecurityRulesDisabled(async (ctx) => {
		const db = ctx.firestore();
		await setDoc(doc(db, `families/${FAMILY}`), { name: 'F', admins: ['alice'] });
		await setDoc(doc(db, `families/${FAMILY}/profiles/lea`), { firstName: 'Léa', role: 'child' });
		await setDoc(doc(db, `families/${FAMILY}/profiles/tom`), { firstName: 'Tom', role: 'child' });
		await setDoc(doc(db, `families/${FAMILY}/profiles/lea/assignments/p1`), { since: 1 });
		await setDoc(doc(db, `families/${FAMILY}/devices/kid-phone`), { profileId: 'lea' });
		await setDoc(doc(db, `families/${FAMILY}/concepts/c1`), { title: 'C', archived: false });
		await setDoc(doc(db, `families/${FAMILY}/concepts/c1/exercises/e1`), { type: 'mcq' });
		await setDoc(doc(db, `families/${FAMILY}/subjects/maths`), { name: 'Maths' });
		await setDoc(doc(db, `families/${FAMILY}/paths/p1`), { title: 'P' });
		await setDoc(doc(db, `families/${FAMILY}/assessments/c1`), { type: 'brevet' });
		// A family created before "family id = uid" (auto id), still administered by alice.
		await setDoc(doc(db, 'families/legacy123'), { name: 'Old', admins: ['alice'] });
	});
});

describe('families', () => {
	it('a user creates only their own family (id = uid), as sole admin', async () => {
		// Invalid creations first (once families/bob exists, a set is an admin update).
		await assertFails(setDoc(at(as('bob'), 'families/carol'), { name: 'C', admins: ['bob'] }));
		await assertFails(setDoc(at(as('bob'), 'families/bob'), { name: 'B', admins: ['bob', 'x'] }));
		await assertFails(setDoc(at(as('bob'), 'families/bob'), { name: 'B', admins: ['alice'] }));
		await assertSucceeds(setDoc(at(as('bob'), 'families/bob'), { name: 'B', admins: ['bob'] }));
	});

	it('the real first-login sequence works for a new parent (family → profile → index)', async () => {
		const bob = as('bob');
		await assertSucceeds(
			setDoc(at(bob, 'families/bob'), { name: 'B', admins: ['bob'], createdAt: 1 })
		);
		// Relies on get() seeing the family committed by the previous write.
		await assertSucceeds(
			setDoc(at(bob, 'families/bob/profiles/bob'), { firstName: 'Bob', role: 'admin' })
		);
		await assertSucceeds(setDoc(at(bob, 'users/bob'), { familyId: 'bob', profileId: 'bob' }));
	});

	it('non-admins cannot update or delete a family', async () => {
		await assertFails(updateDoc(at(as('bob'), `families/${FAMILY}`), { admins: ['bob'] }));
		await assertFails(deleteDoc(at(as('bob'), `families/${FAMILY}`)));
		await assertFails(updateDoc(at(as('kid-phone'), `families/${FAMILY}`), { name: 'X' }));
	});

	it('a first-login retry rewrites the same family (admin update)', async () => {
		await assertSucceeds(
			setDoc(at(as('alice'), `families/${FAMILY}`), { name: 'F2', admins: ['alice'] })
		);
	});

	it('admins have full access to their family; others none', async () => {
		await assertSucceeds(setDoc(at(as('alice'), `families/${FAMILY}/concepts/c2`), { t: 1 }));
		await assertSucceeds(setDoc(at(as('alice'), `families/${FAMILY}/profiles/x`), { t: 1 }));
		await assertSucceeds(setDoc(at(as('alice'), 'families/legacy123/concepts/c'), { t: 1 }));
		await assertFails(getDoc(at(as('bob'), `families/${FAMILY}`)));
		await assertFails(getDoc(at(as('bob'), `families/${FAMILY}/concepts/c1`)));
		await assertFails(setDoc(at(as('bob'), `families/${FAMILY}/profiles/x`), { t: 1 }));
		await assertFails(getDoc(at(anonymous(), `families/${FAMILY}/concepts/c1`)));
	});
});

describe('users index', () => {
	it('a user reads and creates only their own entry, with the expected keys', async () => {
		const entry = { familyId: FAMILY, profileId: 'alice' };
		await assertSucceeds(setDoc(at(as('alice'), 'users/alice'), entry));
		await assertSucceeds(getDoc(at(as('alice'), 'users/alice')));
		await assertFails(getDoc(at(as('bob'), 'users/alice')));
		await assertFails(setDoc(at(as('bob'), 'users/bob'), { ...entry, role: 'admin' }));
		await assertFails(setDoc(at(as('bob'), 'users/alice'), entry));
	});

	it('the index cannot be updated', async () => {
		await env.withSecurityRulesDisabled((ctx) =>
			setDoc(doc(ctx.firestore(), 'users/alice'), { familyId: FAMILY, profileId: 'alice' })
		);
		await assertFails(updateDoc(at(as('alice'), 'users/alice'), { familyId: 'other' }));
	});
});

describe('linked devices (phase 5)', () => {
	it('read the family and the whole catalogue but cannot write it', async () => {
		const kid = as('kid-phone');
		for (const path of [
			'',
			'/subjects/maths',
			'/paths/p1',
			'/concepts/c1',
			'/concepts/c1/exercises/e1',
			'/assessments/c1'
		]) {
			await assertSucceeds(getDoc(at(kid, `families/${FAMILY}${path}`)));
		}
		await assertFails(setDoc(at(kid, `families/${FAMILY}/concepts/c1`), { t: 1 }));
		await assertFails(setDoc(at(kid, `families/${FAMILY}/paths/p1`), { t: 1 }));
	});

	it('cannot write profiles, assignments or device links (phase 5 will open some)', async () => {
		const kid = as('kid-phone');
		await assertFails(updateDoc(at(kid, `families/${FAMILY}/profiles/lea`), { points: 999 }));
		await assertFails(setDoc(at(kid, `families/${FAMILY}/profiles/lea/assignments/p2`), { s: 1 }));
		await assertFails(setDoc(at(kid, `families/${FAMILY}/devices/kid-phone`), { profileId: 'x' }));
	});

	it('read only their own profile and its subcollections, and their device entry', async () => {
		await assertSucceeds(getDoc(at(as('kid-phone'), `families/${FAMILY}/profiles/lea`)));
		await assertSucceeds(
			getDoc(at(as('kid-phone'), `families/${FAMILY}/profiles/lea/assignments/p1`))
		);
		await assertFails(getDoc(at(as('kid-phone'), `families/${FAMILY}/profiles/tom`)));
		await assertSucceeds(getDoc(at(as('kid-phone'), `families/${FAMILY}/devices/kid-phone`)));
		await assertFails(getDoc(at(as('kid-phone'), `families/${FAMILY}/devices/other`)));
	});
});
