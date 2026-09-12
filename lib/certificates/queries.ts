import { adminDb } from '@/lib/firebase/admin';
import { getCurrentUser } from '@/lib/auth/session';
import { getProfile } from '@/lib/auth/profile';
import type { Certificate, CertificateTemplate } from './types';

const TEMPLATES = 'certificateTemplates';
const CERTIFICATES = 'certificates';

export async function getTemplateByKey(key: string): Promise<CertificateTemplate | null> {
  // A single equality filter needs no composite index, unlike the
  // published+orderBy query below — so filter `published` in code instead
  // of adding a second `where`.
  const snap = await adminDb.collection(TEMPLATES).where('key', '==', key).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  const template = { id: doc.id, ...doc.data() } as CertificateTemplate;
  return template.published ? template : null;
}

export async function getPublishedTemplates(): Promise<Pick<CertificateTemplate, 'id' | 'key' | 'name'>[]> {
  // Templates are a handful of admin-managed rows, not a scan-worthy
  // collection — filtering/sorting here avoids needing a Firestore
  // composite index just for `published == true` + `orderBy(name)`.
  const snap = await adminDb.collection(TEMPLATES).get();
  return snap.docs
    .map((doc) => ({ id: doc.id, key: doc.data().key as string, name: doc.data().name as string, published: doc.data().published as boolean }))
    .filter((t) => t.published)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(({ id, key, name }) => ({ id, key, name }));
}

export async function getVetProfile() {
  const user = await getCurrentUser();
  if (!user) return null;
  return getProfile(user.uid);
}

export async function getCertificateDraft(id: string): Promise<Certificate | null> {
  const snap = await adminDb.collection(CERTIFICATES).doc(id).get();
  if (!snap.exists) return null;
  const data = snap.data();
  if (data?.status !== 'draft') return null;
  return { id: snap.id, ...data } as Certificate;
}
