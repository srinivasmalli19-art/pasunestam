import { adminDb } from '@/lib/firebase/admin';
import type { Scheme } from './types';

export async function getSchemes(): Promise<Scheme[]> {
  const snap = await adminDb.collection('schemes').get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Scheme).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
