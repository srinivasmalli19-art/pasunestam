// `npm run emulators` — starts the Firebase Auth + Firestore emulators the
// way this app expects:
// - always as the "demo-pasunestam" project, the same id the app falls back
//   to (lib/firebase/env.ts). .firebaserc's real project id would make the
//   emulator and the app look at two different (empty vs seeded) databases,
//   and a "demo-" id guarantees nothing ever reaches the real project;
// - loads the test data saved last time (./emulator-data) if there is any,
//   and saves it again on Ctrl+C, so accounts and certificates survive a
//   restart. (Firebase's --import fails outright if the folder is missing,
//   hence the check here instead of a fixed flag in package.json.)

import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';

const DATA_DIR = './emulator-data';
const args = ['emulators:start', '--only', 'auth,firestore', '--project', 'demo-pasunestam', `--export-on-exit=${DATA_DIR}`];
if (existsSync(`${DATA_DIR}/firebase-export-metadata.json`)) args.push(`--import=${DATA_DIR}`);

const child = spawn('firebase', args, { stdio: 'inherit', shell: process.platform === 'win32' });
child.on('exit', (code) => process.exit(code ?? 0));
// Let Ctrl+C reach the emulator itself so it can save the data before exiting.
process.on('SIGINT', () => {});
