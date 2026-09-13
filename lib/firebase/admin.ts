// firebase-admin, initialized once per server process. Runs fine in
// proxy.ts, Server Components and Server Actions because this Next.js
// version defaults `proxy.ts` to the Node.js runtime (see
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md),
// unlike mainline Next.js's historical Edge-only middleware.

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getFirebaseAdminCredentials, getFirebaseProjectId, getStorageBucket, usingEmulators } from './env';

function ensureInitialized() {
  // Next's dev-mode hot reload can re-run this module without restarting the
  // process; only initialize once or firebase-admin throws "app already exists".
  if (getApps().length > 0) return;

  if (usingEmulators()) {
    // The Firebase Local Emulator Suite doesn't check credentials — a
    // project id is all initializeApp needs; the FIRESTORE_EMULATOR_HOST /
    // FIREBASE_AUTH_EMULATOR_HOST env vars redirect every call to it.
    initializeApp({ projectId: getFirebaseProjectId(), storageBucket: getStorageBucket() });
    return;
  }

  initializeApp({ credential: cert(getFirebaseAdminCredentials()), storageBucket: getStorageBucket() });
}

ensureInitialized();

export const adminAuth = getAuth();
export const adminDb = getFirestore();
export const adminStorage = getStorage();
