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

/**
 * Service-account JSON keys store the private key with literal "\n"
 * sequences once flattened into a single .env line; turn them back into
 * real newlines or the PEM key fails to parse. Also strips a pair of
 * surrounding quotes if present: a `.env` *file* uses quotes as syntax (the
 * value itself never includes them), but a hosting UI's env var box is a
 * plain text field — paste the value there "as it appears in .env.local,
 * quotes and all" and the quotes become part of the literal string, which
 * corrupts the PEM and fails with a cryptic OpenSSL DECODER error. Stripping
 * them here means it works whichever way it was pasted.
 */
export function normalizePrivateKey(raw: string): string {
  const trimmed = raw.trim();
  const unquoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))
      ? trimmed.slice(1, -1)
      : trimmed;
  return unquoted.replace(/\\n/g, '\n');
}

/** Service-account credentials, only required when not using the emulators. */
export function getFirebaseAdminCredentials() {
  return {
    projectId: getFirebaseProjectId(),
    clientEmail: readEnv('FIREBASE_CLIENT_EMAIL'),
    privateKey: normalizePrivateKey(readEnv('FIREBASE_PRIVATE_KEY')),
  };
}

/** The Storage bucket for uploaded scheme forms. Falls back to the modern default naming if not set explicitly. */
export function getStorageBucket(): string {
  return process.env.FIREBASE_STORAGE_BUCKET || `${getFirebaseProjectId()}.firebasestorage.app`;
}

export function getPublicFirebaseApiKey(): string {
  // The emulator doesn't validate the API key at all, so local development
  // needs no real Firebase project — only a real project requires the real key.
  if (usingEmulators()) return process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'emulator-fake-api-key';
  return readEnv('NEXT_PUBLIC_FIREBASE_API_KEY');
}
