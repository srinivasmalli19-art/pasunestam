// Reads Firebase settings and fails fast with a clear message if .env.local
// is missing them, instead of a confusing crash deep in a page.

function readEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env.local and fill in your Firebase project's ` +
        `settings, then restart "npm run dev". See README.md for where to find them.`
    );
  }
  return value;
}

/** True while developing against the Firebase Local Emulator Suite (`npm run emulators`). */
export function usingEmulators(): boolean {
  return Boolean(process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST);
}

export function getFirebaseProjectId(): string {
  return process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-pasunestam';
}

/** Service-account credentials, only required when not using the emulators. */
export function getFirebaseAdminCredentials() {
  return {
    projectId: getFirebaseProjectId(),
    clientEmail: readEnv('FIREBASE_CLIENT_EMAIL'),
    // Service-account JSON keys store the private key with literal "\n"
    // sequences once flattened into a single .env line; turn them back into
    // real newlines or the PEM key fails to parse.
    privateKey: readEnv('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
  };
}

export function getPublicFirebaseApiKey(): string {
  // The emulator doesn't validate the API key at all, so local development
  // needs no real Firebase project — only a real project requires the real key.
  if (usingEmulators()) return process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'emulator-fake-api-key';
  return readEnv('NEXT_PUBLIC_FIREBASE_API_KEY');
}
