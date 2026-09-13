import { adminDb } from '@/lib/firebase/admin';
import type { Case } from './types';

const CASES = 'cases';

/** Only cases an editor has published show up publicly — a fresh submission stays invisible until then. */
export async function getPublishedCases(): Promise<Case[]> {
  const snap = await adminDb.collection(CASES).where('status', '==', 'published').get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Case).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
