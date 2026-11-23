// Runs the Firestore rules tests (npm run test:rules).
// Reuses the Firestore emulator if it already runs (`npm run emulators`), otherwise starts one
// just for the tests. The tests use the project `demo-pocketclass-rules`, so they never touch
// the data of the dev emulators. Port: firebase.json (also in tests/rules and src/lib/firebase.ts).
import { spawnSync } from 'node:child_process';

const HOST = '127.0.0.1';
const PORT = 8180;

/** 'emulator': the Firestore emulator answers; 'other': another program holds the port. */
async function probe(): Promise<'emulator' | 'other' | 'free'> {
	try {
		const response = await fetch(`http://${HOST}:${PORT}/`);
		// The Firestore emulator answers "Ok" on its root.
		return (await response.text()).trim() === 'Ok' ? 'emulator' : 'other';
	} catch {
		return 'free';
	}
}

const state = await probe();
if (state === 'other') {
	console.error(
		`Port ${PORT} is used by another program, not the Firestore emulator. ` +
			`Free it or change the port in firebase.json (and the files listed in this script).`
	);
	process.exit(1);
}

const vitest = 'vitest --run --project rules';
const command =
	state === 'emulator' ? vitest : `firebase emulators:exec --only firestore "${vitest}"`;

console.log(`> ${command}`);
// Localhost must not go through a proxy (gRPC to the emulator).
const env = { ...process.env, NO_PROXY: `${HOST},localhost`, no_grpc_proxy: `${HOST},localhost` };
const { status } = spawnSync(command, { stdio: 'inherit', shell: true, env });
process.exit(status ?? 1);
