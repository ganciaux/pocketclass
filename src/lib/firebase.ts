import { dev } from '$app/env';
import {
	PUBLIC_FIREBASE_API_KEY,
	PUBLIC_FIREBASE_APP_ID,
	PUBLIC_FIREBASE_AUTH_DOMAIN,
	PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
	PUBLIC_FIREBASE_PROJECT_ID,
	PUBLIC_FIREBASE_STORAGE_BUCKET,
	PUBLIC_USE_EMULATORS
} from '$app/env/public';
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import {
	connectFirestoreEmulator,
	initializeFirestore,
	persistentLocalCache,
	persistentMultipleTabManager
} from 'firebase/firestore';

export const app = initializeApp({
	apiKey: PUBLIC_FIREBASE_API_KEY,
	authDomain: PUBLIC_FIREBASE_AUTH_DOMAIN,
	projectId: PUBLIC_FIREBASE_PROJECT_ID,
	storageBucket: PUBLIC_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
	appId: PUBLIC_FIREBASE_APP_ID
});

// Persistent IndexedDB cache: documents read once stay available offline.
// ignoreUndefinedProperties: optional fields absent from the import JSON are simply not written.
export const db = initializeFirestore(app, {
	ignoreUndefinedProperties: true,
	localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

export const auth = getAuth(app);

export const usingEmulators = dev && PUBLIC_USE_EMULATORS;

if (usingEmulators) {
	connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
	connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
