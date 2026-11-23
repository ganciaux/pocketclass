// Runs the Firestore rules tests (npm run test:rules).
// Reuses the Firestore emulator if one already listens on 8080 (`npm run emulators`), otherwise
// starts one just for the tests. The tests use the project `demo-pocketclass-rules`, so they
// never touch the data of the dev emulators.
import { spawnSync } from 'node:child_process';
import { connect } from 'node:net';

const HOST = '127.0.0.1';
const PORT = 8080;

function isListening(): Promise<boolean> {
	return new Promise((resolve) => {
		const socket = connect(PORT, HOST);
		socket.once('connect', () => (socket.destroy(), resolve(true)));
		socket.once('error', () => resolve(false));
	});
}

const vitest = 'vitest --run --project rules';
const command = (await isListening())
	? vitest
	: `firebase emulators:exec --only firestore "${vitest}"`;

console.log(`> ${command}`);
// Localhost must not go through a proxy (gRPC to the emulator).
const env = { ...process.env, NO_PROXY: `${HOST},localhost`, no_grpc_proxy: `${HOST},localhost` };
const { status } = spawnSync(command, { stdio: 'inherit', shell: true, env });
process.exit(status ?? 1);
