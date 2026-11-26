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
	increment,
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
			'/concepts/c1/mapImages/image-1',
			'/assessments/c1'
		]) {
			await assertSucceeds(getDoc(at(kid, `families/${FAMILY}${path}`)));
		}
		await assertFails(setDoc(at(kid, `families/${FAMILY}/concepts/c1`), { t: 1 }));
		await assertFails(setDoc(at(kid, `families/${FAMILY}/chapters/ch1`), { t: 1 }));
		await assertFails(setDoc(at(kid, `families/${FAMILY}/subjects/maths`), { t: 1 }));
		const image = { dataUrl: 'data:image/webp;base64,AAAA', order: 1 };
		await assertFails(setDoc(at(kid, `families/${FAMILY}/concepts/c1/mapImages/image-1`), image));
		await assertSucceeds(
			setDoc(at(as('alice'), `families/${FAMILY}/concepts/c1/mapImages/image-1`), image)
		);
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

	it('count sheet opens and started runs one at a time (statistics)', async () => {
		const kid = as('kid-phone');
		const where = { subjectId: 'maths', chapterId: 'ch1' };
		const path = `${lea}/progress/c5`;
		const set = (fields: object) => setDoc(at(kid, path), { ...where, ...fields }, { merge: true });
		await assertSucceeds(set({ openedAt: serverTimestamp(), openCount: increment(1) }));
		await assertSucceeds(set({ openCount: increment(1), seriesStarted: increment(1) }));
		await assertSucceeds(set({ challengeStarted: 1, assessmentStarted: 1 }));
		await assertSucceeds(set({ openedAt: serverTimestamp() })); // unchanged counters
		await assertFails(set({ openCount: increment(2) }));
		await assertFails(set({ seriesStarted: 0 }));
		await assertFails(set({ challengeStarted: 'x' }));
		await assertFails(set({ unknownCount: 1 }));
		await assertFails(setDoc(at(kid, `${lea}/progress/c6`), { ...where, assessmentStarted: 5 }));
	});

	it('remember the mind map questions already drawn (a bounded list)', async () => {
		const kid = as('kid-phone');
		const where = { subjectId: 'maths', chapterId: 'ch1' };
		const path = `${lea}/progress/c4`;
		await assertSucceeds(setDoc(at(kid, path), { ...where, mapDrawn: ['ex-1', 'ex-2'] }));
		await assertSucceeds(setDoc(at(kid, path), { ...where, mapDrawn: [] }, { merge: true }));
		await assertFails(setDoc(at(kid, path), { ...where, mapDrawn: 'ex-1' }, { merge: true }));
		const tooMany = Array.from({ length: 201 }, (_, i) => `ex-${i}`);
		await assertFails(setDoc(at(kid, path), { ...where, mapDrawn: tooMany }, { merge: true }));
	});

	it('record practice scores and create (never change) their attempts', async () => {
		const kid = as('kid-phone');
		const where = { subjectId: 'maths', chapterId: 'ch1' };
		const scores = {
			...where,
			practiceLast: { correct: 7, total: 10 },
			practiceBest: { correct: 9, total: 10 },
			practicedAt: serverTimestamp()
		};
		await assertSucceeds(setDoc(at(kid, `${lea}/progress/c2`), scores, { merge: true }));
		await assertSucceeds(setDoc(at(kid, `${lea}/progress/c2`), scores, { merge: true }));
		await assertFails(
			setDoc(
				at(kid, `${lea}/progress/c3`),
				{ ...where, practiceBest: { correct: 11, total: 10 } },
				{ merge: true }
			)
		);
		await assertFails(
			setDoc(
				at(kid, `${lea}/progress/c3`),
				{ ...where, practiceBest: { correct: 1, total: 1, points: 50 } },
				{ merge: true }
			)
		);

		const record = { ...where, challengeBest: 12, challengedAt: serverTimestamp() };
		await assertSucceeds(setDoc(at(kid, `${lea}/progress/c2`), record, { merge: true }));
		await assertFails(
			setDoc(at(kid, `${lea}/progress/c2`), { ...where, challengeBest: 101 }, { merge: true })
		);
		await assertFails(
			setDoc(at(kid, `${lea}/progress/c2`), { ...where, challengeBest: 'x' }, { merge: true })
		);

		const attempt = {
			conceptId: 'c2',
			...where,
			mode: 'series',
			correct: 1,
			total: 2,
			answers: [
				{ exerciseId: 'e1', correct: true },
				{ exerciseId: 'e2', correct: false }
			],
			createdAt: serverTimestamp()
		};
		await assertSucceeds(setDoc(at(kid, `${lea}/attempts/a1`), attempt));
		await assertSucceeds(setDoc(at(kid, `${lea}/attempts/a3`), { ...attempt, mode: 'timed' }));
		await assertSucceeds(setDoc(at(kid, `${lea}/attempts/a4`), { ...attempt, mode: 'review' }));
		await assertFails(setDoc(at(kid, `${lea}/attempts/a5`), { ...attempt, mode: 'cheat' }));
		await assertSucceeds(getDoc(at(kid, `${lea}/attempts/a1`)));
		await assertFails(updateDoc(at(kid, `${lea}/attempts/a1`), { correct: 2 }));
		await assertFails(deleteDoc(at(kid, `${lea}/attempts/a1`)));
		await assertFails(setDoc(at(kid, `${lea}/attempts/a2`), { ...attempt, correct: 3 }));
		await assertFails(setDoc(at(kid, `${lea}/attempts/a2`), { ...attempt, mode: 'exam' }));
		await assertFails(setDoc(at(kid, `${lea}/attempts/a2`), { ...attempt, points: 10 }));
		await assertFails(setDoc(at(kid, `families/${FAMILY}/profiles/tom/attempts/a2`), attempt));
	});

	it('a passed assessment stamps the sheet and earns its points once, by the right amount', async () => {
		await env.withSecurityRulesDisabled(async (ctx) => {
			const db = ctx.firestore();
			await setDoc(doc(db, `families/${FAMILY}/concepts/c4`), {
				title: 'C4',
				keyPoints: [{ id: 'a' }, { id: 'b' }],
				archived: false
			});
			await setDoc(doc(db, `families/${FAMILY}/assessments/c4`), { type: 'test', passRate: 80 });
			await updateDoc(doc(db, lea), { points: 5 });
		});
		const kid = as('kid-phone');
		const where = { subjectId: 'maths', chapterId: 'ch1' };
		const progressPath = `${lea}/progress/c4`;
		const scored = (correct: number) => ({
			...where,
			assessmentLast: { correct, total: 10 },
			assessmentBest: { correct, total: 10 },
			assessedAt: serverTimestamp()
		});

		// A fail (7/10 < 80 %): the « Raté » stamp and the lock are the child's, « Acquise » is not.
		await assertSucceeds(
			setDoc(
				at(kid, progressPath),
				{ ...scored(7), failedAt: serverTimestamp(), retakeLocked: true },
				{ merge: true }
			)
		);
		await assertFails(
			setDoc(
				at(kid, progressPath),
				{ ...scored(7), acquiredAt: serverTimestamp() },
				{ merge: true }
			)
		);

		/** The pass batch: stamp, points line, profile points (as `data/assessment.ts`). */
		const pass = (correct: number, amount = 20) => {
			const batch = writeBatch(kid);
			batch.set(
				at(kid, progressPath),
				{
					...scored(correct),
					acquiredAt: serverTimestamp(),
					failedAt: deleteField(),
					retakeLocked: deleteField(),
					assessmentPoints: amount
				},
				{ merge: true }
			);
			batch.set(at(kid, `${lea}/pointsLedger/assessment-c4`), {
				kind: 'assessment',
				conceptId: 'c4',
				...where,
				amount,
				createdAt: serverTimestamp()
			});
			batch.update(at(kid, lea), { points: increment(amount), lastEarningId: 'assessment-c4' });
			return batch.commit();
		};
		await assertFails(pass(7)); // under the pass rate
		await assertFails(pass(8, 50)); // not the sheet's amount (10 per key point)
		await assertSucceeds(pass(8));
		const profile = await getDoc(at(kid, lea));
		if (profile.data()?.points !== 25) throw new Error(`points: ${profile.data()?.points}`);
		// Once per sheet; a later try only updates the scores.
		await assertFails(pass(10));
		await assertSucceeds(setDoc(at(kid, progressPath), scored(10), { merge: true }));
		await assertFails(
			setDoc(at(kid, progressPath), { ...where, assessmentPoints: 99 }, { merge: true })
		);
		// Points never move on their own.
		await assertFails(updateDoc(at(kid, lea), { points: 1000 }));
		await assertFails(updateDoc(at(kid, lea), { points: 1000, lastEarningId: 'assessment-c4' }));
		await assertFails(
			setDoc(at(kid, `${lea}/pointsLedger/assessment-c1`), {
				kind: 'assessment',
				conceptId: 'c1',
				...where,
				amount: 0,
				createdAt: serverTimestamp()
			})
		);
		// The attempt history accepts the assessment mode.
		await assertSucceeds(
			setDoc(at(kid, `${lea}/attempts/x1`), {
				conceptId: 'c4',
				...where,
				mode: 'assessment',
				correct: 1,
				total: 1,
				answers: [{ exerciseId: 'e1', correct: true }],
				createdAt: serverTimestamp()
			})
		);
	});

	it('a series at 70 % on an acquired sheet earns revision points, then once a week', async () => {
		const where = { subjectId: 'maths', chapterId: 'ch1' };
		await env.withSecurityRulesDisabled(async (ctx) => {
			const db = ctx.firestore();
			for (const id of ['c5', 'c6']) {
				await setDoc(doc(db, `families/${FAMILY}/concepts/${id}`), {
					title: id,
					keyPoints: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
					archived: false
				});
			}
			await setDoc(doc(db, `${lea}/progress/c5`), { ...where, acquiredAt: Timestamp.now() });
			await setDoc(doc(db, `${lea}/progress/c6`), { ...where, openedAt: Timestamp.now() });
			await updateDoc(doc(db, lea), { points: 0 });
		});
		const kid = as('kid-phone');

		/** The series batch with its revision (as `data/practice.ts` `saveSeries`). */
		const revise = (sheet: string, correct: number, count: number, amount = 6, total = amount) => {
			const id = `revision-${sheet}-${count}`;
			const batch = writeBatch(kid);
			batch.set(
				at(kid, `${lea}/progress/${sheet}`),
				{
					...where,
					practiceLast: { correct, total: 10 },
					practicedAt: serverTimestamp(),
					revisedAt: serverTimestamp(),
					revisionCount: count,
					revisionPoints: total
				},
				{ merge: true }
			);
			batch.set(at(kid, `${lea}/pointsLedger/${id}`), {
				kind: 'revision',
				conceptId: sheet,
				...where,
				amount,
				createdAt: serverTimestamp()
			});
			batch.update(at(kid, lea), { points: increment(amount), lastEarningId: id });
			return batch.commit();
		};
		await assertFails(revise('c5', 6, 1)); // under 70 %
		await assertFails(revise('c5', 7, 1, 30)); // not 2 points per key point
		await assertFails(revise('c5', 7, 2)); // skips a revision number
		await assertFails(revise('c6', 10, 1)); // not acquired
		await assertSucceeds(revise('c5', 7, 1));
		const profile = await getDoc(at(kid, lea));
		if (profile.data()?.points !== 6) throw new Error(`points: ${profile.data()?.points}`);
		// The hourglass: nothing more during the week, and the fields never move on their own.
		await assertFails(revise('c5', 10, 2, 6, 12));
		await assertFails(
			setDoc(at(kid, `${lea}/progress/c5`), { ...where, revisionPoints: 99 }, { merge: true })
		);
		await env.withSecurityRulesDisabled(async (ctx) => {
			const eightDaysAgo = Timestamp.fromMillis(Date.now() - 8 * 24 * 3600_000);
			await updateDoc(doc(ctx.firestore(), `${lea}/progress/c5`), { revisedAt: eightDaysAgo });
		});
		await assertFails(revise('c5', 10, 2, 6, 99)); // the total must grow by the line's amount
		await assertSucceeds(revise('c5', 10, 2, 6, 12));
		// A new progress document never carries a revision.
		await assertFails(
			setDoc(at(kid, `${lea}/progress/c7`), {
				...where,
				revisionCount: 1,
				revisedAt: serverTimestamp()
			})
		);
	});

	it('a first pass may create the progress; defaults when the sheet has no assessment document', async () => {
		await env.withSecurityRulesDisabled(async (ctx) => {
			const db = ctx.firestore();
			const keyPoints = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
			// c5: imported before assessments (no document): 70 %, 10 points per key point.
			await setDoc(doc(db, `families/${FAMILY}/concepts/c5`), { keyPoints, archived: false });
			// c6: the parent set the amount.
			await setDoc(doc(db, `families/${FAMILY}/concepts/c6`), { keyPoints, archived: false });
			await setDoc(doc(db, `families/${FAMILY}/assessments/c6`), { type: 'test', points: 5 });
			await updateDoc(doc(db, lea), { points: 0 });
		});
		const kid = as('kid-phone');
		const where = { subjectId: 'maths', chapterId: 'ch1' };
		/** First pass on a sheet never opened: the progress document is created by the batch. */
		const pass = (sheet: string, correct: number, amount: number) => {
			const batch = writeBatch(kid);
			batch.set(at(kid, `${lea}/progress/${sheet}`), {
				...where,
				assessmentLast: { correct, total: 10 },
				assessmentBest: { correct, total: 10 },
				assessedAt: serverTimestamp(),
				acquiredAt: serverTimestamp(),
				assessmentPoints: amount
			});
			batch.set(at(kid, `${lea}/pointsLedger/assessment-${sheet}`), {
				kind: 'assessment',
				conceptId: sheet,
				...where,
				amount,
				createdAt: serverTimestamp()
			});
			batch.update(at(kid, lea), {
				points: increment(amount),
				lastEarningId: `assessment-${sheet}`
			});
			return batch.commit();
		};
		await assertFails(pass('c5', 6, 30)); // under 70 %
		await assertSucceeds(pass('c5', 7, 30));
		await assertFails(pass('c6', 9, 30)); // the parent's amount is 5
		await assertSucceeds(pass('c6', 9, 5));
		const profile = await getDoc(at(kid, lea));
		if (profile.data()?.points !== 35) throw new Error(`points: ${profile.data()?.points}`);
	});

	it('only the parent stamps a sheet without a passed assessment; the child still opens and reads it', async () => {
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

	it('write notes on a chapter, a subject or free (no target)', async () => {
		const kid = as('kid-phone');
		const note = {
			conceptId: null,
			chapterId: null,
			subjectId: null,
			exerciseId: null,
			text: 'Je ne sais plus où ranger mes fiches',
			status: 'open',
			createdAt: serverTimestamp(),
			updatedAt: serverTimestamp()
		};
		await assertSucceeds(setDoc(at(kid, `${lea}/notes/free`), note));
		await assertSucceeds(setDoc(at(kid, `${lea}/notes/chapter`), { ...note, chapterId: 'ch1' }));
		await assertSucceeds(setDoc(at(kid, `${lea}/notes/subject`), { ...note, subjectId: 'maths' }));
		await assertSucceeds(
			setDoc(at(kid, `${lea}/notes/sheet`), {
				...note,
				conceptId: 'c1',
				chapterId: 'ch1',
				subjectId: 'maths'
			})
		);
		await assertFails(setDoc(at(kid, `${lea}/notes/bad`), { ...note, subjectId: 42 }));
		await assertFails(setDoc(at(kid, `${lea}/notes/bad`), { ...note, chapterId: ['ch1'] }));
		await assertFails(setDoc(at(kid, `${lea}/notes/bad`), { ...note, place: 'home' }));
		await assertSucceeds(updateDoc(at(kid, `${lea}/notes/free`), { text: 'Rangé !' }));
		await assertFails(updateDoc(at(kid, `${lea}/notes/free`), { subjectId: 'maths' }));
	});
});

describe('parent test mode', () => {
	const own = `families/${FAMILY}/profiles/alice`;

	it('the parent records and clears test progress, notes and attempts on their own profile', async () => {
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
		const attempt = { conceptId: 'c1', mode: 'series', correct: 0, total: 0, answers: [] };
		await assertSucceeds(setDoc(at(alice, `${own}/attempts/t1`), attempt));
		await assertSucceeds(deleteDoc(at(alice, `${own}/attempts/t1`)));
		// Points earned in test, then taken back by « Remettre à zéro ».
		const line = { kind: 'assessment', conceptId: 'c1', amount: 30, createdAt: serverTimestamp() };
		await assertSucceeds(setDoc(at(alice, `${own}/pointsLedger/assessment-c1`), line));
		await assertSucceeds(setDoc(at(alice, own), { points: 30, lastEarningId: 'assessment-c1' }));
		await assertSucceeds(deleteDoc(at(alice, `${own}/pointsLedger/assessment-c1`)));
		await assertSucceeds(updateDoc(at(alice, own), { points: 0, lastEarningId: deleteField() }));
	});
});
