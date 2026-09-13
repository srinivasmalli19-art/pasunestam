import { adminDb } from '@/lib/firebase/admin';
import type { Admission } from './types';

export async function getAdmissions(): Promise<Admission[]> {
  const snap = await adminDb.collection('admissions').get();
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Admission)
    .sort((a, b) => a.sortDate.localeCompare(b.sortDate));
}
