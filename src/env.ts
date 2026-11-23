import { defineEnvVars } from '@sveltejs/kit/env';

// Firebase web config is public by design (security comes from Firestore rules).
// Values come from .env.local (see .env.example) and are inlined at build time.
const firebaseVar = (description: string) => ({ public: true, static: true, description }) as const;

export const variables = defineEnvVars({
	PUBLIC_FIREBASE_API_KEY: firebaseVar('Firebase web API key'),
	PUBLIC_FIREBASE_AUTH_DOMAIN: firebaseVar('Firebase Auth domain'),
	PUBLIC_FIREBASE_PROJECT_ID: firebaseVar('Firebase project id'),
	PUBLIC_FIREBASE_STORAGE_BUCKET: firebaseVar('Firebase storage bucket'),
	PUBLIC_FIREBASE_MESSAGING_SENDER_ID: firebaseVar('Firebase messaging sender id'),
	PUBLIC_FIREBASE_APP_ID: firebaseVar('Firebase app id'),
	PUBLIC_USE_EMULATORS: {
		public: true,
		static: true,
		description: 'Connect to the local Firebase Emulator Suite in dev mode',
		schema: (value) => value === 'true'
	}
});
