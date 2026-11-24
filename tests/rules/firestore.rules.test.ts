// Firestore security rules tests. Run with the emulator: `npm run test:rules`.
import { readFileSync } from 'node:fs';
import {
	assertFails,
	assertSucceeds,
	initializeTestEnvironment,
	type RulesTestEnvironment
} from '@firebase/rules-unit-testing';
import {
	collection,
	deleteDoc,
	deleteField,
	doc,
	getDoc,
	getDocs,
	serverTimestamp,
	setDoc,
	Timestamp,
	updateDoc,
	writeBatch
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let env: RulesTestEnvironment;

// Family of the parent "alice" (id = her uid). "kid-phone" is a device linked to profile "lea".
const FAMILY = 'alice';

const as = (uid: string) => env.authenticatedContext(uid).firestore();
const anonymous = () => env.unauthenticatedContext().firestore();
/** A child phone: anonymous Firebase account. */
const asAnonymous = (uid: string) =>
	env.authenticatedContext(uid, { firebase: { sign_in_provider: 'anonymous' } }).firestore();
const inMinutes = (minutes: number) => Timestamp.fromMillis(Date.now() + minutes * 60_000);
const at = (db: ReturnType<typeof as>, path: string) => doc(db, path);

beforeAll(async () => {
	env = await initializeTestEnvironment({
		// A demo project: never touches the dev emulator data (or a real project).
		projectId: 'demo-pocketclass-rules',
		firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8180 }
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
		await setDoc(doc(db, `families/${FAMILY}/devices/kid-phone`), { profileId: 'lea' });
		await setDoc(doc(db, `families/${FAMILY}/concepts/c1`), { title: 'C', archived: false });
		await setDoc(doc(db, `families/${FAMILY}/concepts/c1/exercises/e1`), { type: 'mcq' });
		await setDoc(doc(db, `families/${FAMILY}/subjects/maths`), { name: 'Maths' });
		await setDoc(doc(db, `families/${FAMILY}/chapters/ch1`), { title: 'P', subjectId: 'maths' });
		await setDoc(doc(db, `families/${FAMILY}/assessments/c1`), { type: 'brevet' });
		// Link codes for tom: a valid one and an expired one.
		const tomCode = { familyId: FAMILY, profileId: 'tom' };
		await setDoc(doc(db, 'linkCodes/TOMOK2'), { ...tomCode, expiresAt: inMinutes(10) });
		await setDoc(doc(db, 'linkCodes/TOMOLD'), { ...tomCode, expiresAt: inMinutes(-1) });
		await setDoc(doc(db, `families/${FAMILY}/profiles/lea/notes/n1`), {
			conceptId: 'c1',
			chapterId: 'ch1',
			exerciseId: null,
			text: 'Dur',
			status: 'open'
		});
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

	it('a parent cannot repoint their index (only a linked device rewrites it)', async () => {
		await env.withSecurityRulesDisabled((ctx) =>
			setDoc(doc(ctx.firestore(), 'users/alice'), { familyId: FAMILY, profileId: 'alice' })
		);
		await assertFails(updateDoc(at(as('alice'), 'users/alice'), { familyId: 'other' }));
	});
});

describe('linked devices', () => {
	it('read the family and the whole catalogue but cannot write it', async () => {
		const kid = as('kid-phone');
		for (const path of [
			'',
			'/subjects/maths',
			'/chapters/ch1',
			'/concepts/c1',
			'/concepts/c1/exercises/e1',
			'/assessments/c1'
		]) {
			await assertSucceeds(getDoc(at(kid, `families/${FAMILY}${path}`)));
		}
		await assertFails(setDoc(at(kid, `families/${FAMILY}/concepts/c1`), { t: 1 }));
		await assertFails(setDoc(at(kid, `families/${FAMILY}/chapters/ch1`), { t: 1 }));
		await assertFails(setDoc(at(kid, `families/${FAMILY}/subjects/maths`), { t: 1 }));
	});

	it('cannot write points, their extra subjects or their device link without a code', async () => {
		const kid = as('kid-phone');
		const lea = `families/${FAMILY}/profiles/lea`;
		await assertFails(updateDoc(at(kid, lea), { points: 999 }));
		await assertFails(updateDoc(at(kid, lea), { extraSubjects: ['maths-6e'] }));
		await assertSucceeds(updateDoc(at(as('alice'), lea), { extraSubjects: ['maths-6e'] }));
		await assertFails(setDoc(at(kid, `families/${FAMILY}/devices/kid-phone`), { profileId: 'x' }));
	});

	it('read only their own profile and its subcollections, and their device entry', async () => {
		await assertSucceeds(getDoc(at(as('kid-phone'), `families/${FAMILY}/profiles/lea`)));
		await assertSucceeds(getDoc(at(as('kid-phone'), `families/${FAMILY}/profiles/lea/notes/n1`)));
		await assertFails(getDoc(at(as('kid-phone'), `families/${FAMILY}/profiles/tom`)));
		await assertSucceeds(getDoc(at(as('kid-phone'), `families/${FAMILY}/devices/kid-phone`)));
		await assertFails(getDoc(at(as('kid-phone'), `families/${FAMILY}/devices/other`)));
	});
});

/** The batch written by `linkDevice` (data/devices.ts). */
function linkBatch(db: ReturnType<typeof as>, uid: string, code: string, profileId = 'tom') {
	const batch = writeBatch(db);
	batch.set(doc(db, `families/${FAMILY}/devices/${uid}`), {
		profileId,
		code,
		linkedAt: serverTimestamp()
	});
	batch.set(doc(db, `users/${uid}`), { familyId: FAMILY, profileId });
	batch.delete(doc(db, `linkCodes/${code}`));
	return batch.commit();
}

describe('device linking', () => {
	it('an anonymous account cannot create a family', async () => {
		await assertFails(
			setDoc(at(asAnonymous('kid2'), 'families/kid2'), { name: 'K', admins: ['kid2'] })
		);
	});

	it('the parent creates short-lived codes for their own family only', async () => {
		const code = { familyId: FAMILY, profileId: 'tom', expiresAt: inMinutes(10) };
		await assertSucceeds(setDoc(at(as('alice'), 'linkCodes/NEW234'), code));
		await assertFails(
			setDoc(at(as('alice'), 'linkCodes/LONG23'), { ...code, expiresAt: inMinutes(60) })
		);
		await assertFails(setDoc(at(as('bob'), 'linkCodes/BOB234'), code));
		await assertFails(setDoc(at(asAnonymous('kid2'), 'linkCodes/KID234'), code));
	});

	it('codes are read one by one while valid, never listed', async () => {
		const kid = asAnonymous('kid2');
		await assertSucceeds(getDoc(at(kid, 'linkCodes/TOMOK2')));
		await assertSucceeds(getDoc(at(kid, 'linkCodes/NOPE22'))); // missing: "not found"
		await assertFails(getDoc(at(kid, 'linkCodes/TOMOLD')));
		await assertFails(getDocs(collection(kid, 'linkCodes')));
		await assertFails(getDoc(at(anonymous(), 'linkCodes/TOMOK2')));
	});

	it('a valid code links the device: device entry, index and code deletion in one batch', async () => {
		const kid = asAnonymous('kid2');
		await assertSucceeds(linkBatch(kid, 'kid2', 'TOMOK2'));
		await assertSucceeds(getDoc(at(kid, `families/${FAMILY}/profiles/tom`)));
		await assertSucceeds(getDoc(at(kid, `families/${FAMILY}/concepts/c1`)));
		await assertFails(getDoc(at(kid, `families/${FAMILY}/profiles/lea`)));
	});

	it('expired, wrong-profile or forged links are refused', async () => {
		const kid = asAnonymous('kid2');
		await assertFails(linkBatch(kid, 'kid2', 'TOMOLD'));
		await assertFails(linkBatch(kid, 'kid2', 'TOMOK2', 'lea'));
		await assertFails(linkBatch(kid, 'kid2', 'NOPE22'));
		// The index alone cannot point to a family.
		await assertFails(setDoc(at(kid, 'users/kid2'), { familyId: FAMILY, profileId: 'tom' }));
		// Another device's code cannot be deleted.
		await assertFails(deleteDoc(at(kid, 'linkCodes/TOMOK2')));
	});

	it('a code links one device only: the link batch must delete it', async () => {
		const device = { profileId: 'tom', code: 'TOMOK2', linkedAt: serverTimestamp() };
		await assertFails(setDoc(at(asAnonymous('kid2'), `families/${FAMILY}/devices/kid2`), device));
		await assertSucceeds(linkBatch(asAnonymous('kid2'), 'kid2', 'TOMOK2'));
		await assertFails(linkBatch(asAnonymous('kid3'), 'kid3', 'TOMOK2'));
	});

	it('a linked device may switch profile with a new valid code only', async () => {
		const kid = as('kid-phone'); // linked to lea
		await assertFails(linkBatch(kid, 'kid-phone', 'TOMOLD'));
		await assertSucceeds(linkBatch(kid, 'kid-phone', 'TOMOK2'));
		await assertSucceeds(getDoc(at(kid, `families/${FAMILY}/profiles/tom`)));
		await assertFails(getDoc(at(kid, `families/${FAMILY}/profiles/lea`)));
	});

	it('a pending code of a deleted (or non-child) profile links nothing', async () => {
		const parent = as('alice');
		await assertSucceeds(deleteDoc(at(parent, `families/${FAMILY}/profiles/tom`)));
		await assertFails(linkBatch(asAnonymous('kid2'), 'kid2', 'TOMOK2'));
		await env.withSecurityRulesDisabled((ctx) =>
			setDoc(doc(ctx.firestore(), 'linkCodes/ADMIN2'), {
				familyId: FAMILY,
				profileId: 'alice',
				expiresAt: inMinutes(10)
			})
		);
		await env.withSecurityRulesDisabled((ctx) =>
			setDoc(doc(ctx.firestore(), `families/${FAMILY}/profiles/alice`), { role: 'admin' })
		);
		await assertFails(linkBatch(asAnonymous('kid2'), 'kid2', 'ADMIN2', 'alice'));
	});

	it('the parent deletes a child profile with its data; its device loses access', async () => {
		const parent = as('alice');
		const lea = `families/${FAMILY}/profiles/lea`;
		const batch = writeBatch(parent);
		for (const path of [`families/${FAMILY}/devices/kid-phone`, `${lea}/notes/n1`, lea]) {
			batch.delete(doc(parent, path));
		}
		await assertSucceeds(batch.commit());
		await assertFails(getDoc(at(as('kid-phone'), `${lea}/notes/n1`)));
	});

	it('only the parent deletes an unused code', async () => {
		await assertFails(deleteDoc(at(as('bob'), 'linkCodes/TOMOK2')));
		await assertSucceeds(deleteDoc(at(as('alice'), 'linkCodes/TOMOK2')));
	});

	it('an unlinked device can be linked again (index rewritten)', async () => {
		const kid = asAnonymous('kid2');
		await assertSucceeds(linkBatch(kid, 'kid2', 'TOMOK2'));
		await assertSucceeds(deleteDoc(at(kid, `families/${FAMILY}/devices/kid2`)));
		await assertFails(getDoc(at(kid, `families/${FAMILY}/profiles/tom`)));
		await env.withSecurityRulesDisabled((ctx) =>
			setDoc(doc(ctx.firestore(), 'linkCodes/TOMNEW'), {
				familyId: FAMILY,
				profileId: 'tom',
				expiresAt: inMinutes(10)
			})
		);
		await assertSucceeds(linkBatch(kid, 'kid2', 'TOMNEW'));
	});

	it('the parent sees and unlinks devices', async () => {
		await assertSucceeds(getDocs(collection(as('alice'), `families/${FAMILY}/devices`)));
		await assertSucceeds(deleteDoc(at(as('alice'), `families/${FAMILY}/devices/kid-phone`)));
		await assertFails(getDoc(at(as('kid-phone'), `families/${FAMILY}/profiles/lea`)));
	});
});

describe('child writes', () => {
	const lea = `families/${FAMILY}/profiles/lea`;

	it('edit only their nickname and a small image avatar', async () => {
		const kid = as('kid-phone');
		await assertSucceeds(
			updateDoc(at(kid, lea), { nickname: 'Lélé', avatar: 'data:image/webp;base64,AAAA' })
		);
		await assertFails(updateDoc(at(kid, lea), { firstName: 'X' }));
		await assertFails(updateDoc(at(kid, lea), { points: 999 }));
		await assertFails(updateDoc(at(kid, lea), { nickname: 'x'.repeat(25) }));
		await assertFails(updateDoc(at(kid, lea), { avatar: 'https://evil.example/a.png' }));
		await assertFails(
			updateDoc(at(kid, lea), { avatar: `data:image/webp;base64,${'A'.repeat(60000)}` })
		);
		await assertFails(updateDoc(at(kid, `families/${FAMILY}/profiles/tom`), { nickname: 'T' }));
	});

	it('record opened and read sheets on their own profile', async () => {
		const kid = as('kid-phone');
		const where = { subjectId: 'maths', chapterId: 'ch1' };
		const opened = { ...where, openedAt: serverTimestamp() };
		await assertSucceeds(setDoc(at(kid, `${lea}/progress/c1`), opened, { merge: true }));
		await assertSucceeds(
			setDoc(
				at(kid, `${lea}/progress/c1`),
				{ ...where, readAt: serverTimestamp() },
				{ merge: true }
			)
		);
		await assertSucceeds(
			setDoc(at(kid, `${lea}/progress/c1`), { ...where, readAt: deleteField() }, { merge: true })
		);
		await assertSucceeds(deleteDoc(at(kid, `${lea}/progress/c1`)));
		await assertFails(setDoc(at(kid, `${lea}/progress/c1`), { ...opened, score: 20 }));
		await assertFails(setDoc(at(kid, `${lea}/progress/c1`), { openedAt: serverTimestamp() }));
		await assertFails(setDoc(at(kid, `families/${FAMILY}/profiles/tom/progress/c1`), opened));
	});

	it('only the parent stamps a sheet as acquired; the child still opens and reads it', async () => {
		const kid = as('kid-phone');
		const parent = as('alice');
		const path = `${lea}/progress/c1`;
		const where = { subjectId: 'maths', chapterId: 'ch1' };
		const stamp = { ...where, acquiredAt: serverTimestamp() };
		// The child can neither create nor set the stamp.
		await assertFails(setDoc(at(kid, path), { ...where, openedAt: serverTimestamp(), ...stamp }));
		await assertSucceeds(setDoc(at(kid, path), { ...where, openedAt: serverTimestamp() }));
		await assertFails(setDoc(at(kid, path), stamp, { merge: true }));
		// The parent stamps (also a sheet never opened, on another profile).
		await assertSucceeds(setDoc(at(parent, path), stamp, { merge: true }));
		await assertSucceeds(setDoc(at(parent, `families/${FAMILY}/profiles/tom/progress/c1`), stamp));
		// The child keeps opening / reading the stamped sheet, but cannot remove or move the stamp.
		await assertSucceeds(
			setDoc(at(kid, path), { ...where, openedAt: serverTimestamp() }, { merge: true })
		);
		await assertSucceeds(
			setDoc(at(kid, path), { ...where, readAt: serverTimestamp() }, { merge: true })
		);
		await assertFails(
			setDoc(at(kid, path), { ...where, acquiredAt: deleteField() }, { merge: true })
		);
		await assertFails(setDoc(at(kid, path), stamp, { merge: true }));
		await assertFails(deleteDoc(at(kid, path)));
		// The parent removes it.
		await assertSucceeds(
			setDoc(at(parent, path), { ...where, acquiredAt: deleteField() }, { merge: true })
		);
	});

	it('write open notes; only the parent sets seen / resolved', async () => {
		const kid = as('kid-phone');
		const note = {
			conceptId: 'c1',
			chapterId: 'ch1',
			exerciseId: null,
			text: 'Les fractions négatives',
			status: 'open',
			createdAt: serverTimestamp(),
			updatedAt: serverTimestamp()
		};
		await assertSucceeds(setDoc(at(kid, `${lea}/notes/n2`), note));
		await assertFails(setDoc(at(kid, `${lea}/notes/n3`), { ...note, status: 'resolved' }));
		await assertFails(setDoc(at(kid, `${lea}/notes/n3`), { ...note, text: '' }));
		await assertSucceeds(updateDoc(at(kid, `${lea}/notes/n1`), { text: 'Très dur' }));
		await assertFails(updateDoc(at(kid, `${lea}/notes/n1`), { status: 'resolved' }));
		await assertFails(updateDoc(at(kid, `${lea}/notes/n1`), { conceptId: 'c2' }));
		await assertSucceeds(deleteDoc(at(kid, `${lea}/notes/n2`)));
		await assertFails(setDoc(at(kid, `families/${FAMILY}/profiles/tom/notes/n4`), note));
		await assertSucceeds(updateDoc(at(as('alice'), `${lea}/notes/n1`), { status: 'resolved' }));
	});
});

describe('parent test mode', () => {
	const own = `families/${FAMILY}/profiles/alice`;

	it('the parent records and clears test progress and notes on their own profile', async () => {
		const alice = as('alice');
		const progress = { subjectId: 'maths', chapterId: 'ch1', openedAt: serverTimestamp() };
		const note = {
			conceptId: 'c1',
			chapterId: 'ch1',
			exerciseId: null,
			text: 'Test',
			status: 'open',
			createdAt: serverTimestamp(),
			updatedAt: serverTimestamp()
		};
		await assertSucceeds(setDoc(at(alice, `${own}/progress/c1`), progress));
		await assertSucceeds(setDoc(at(alice, `${own}/notes/t1`), note));
		await assertFails(getDoc(at(as('kid-phone'), `${own}/progress/c1`)));
		await assertSucceeds(deleteDoc(at(alice, `${own}/progress/c1`)));
		await assertSucceeds(deleteDoc(at(alice, `${own}/notes/t1`)));
	});
});
