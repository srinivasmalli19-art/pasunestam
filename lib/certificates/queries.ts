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

/**
 * Loads a certificate (draft or issued) for the builder route to show —
 * read-only once issued, editable while a draft. Scoped to the signed-in
 * vet's own certificates; anyone else's id just falls back to a blank form
 * rather than leaking another vet's data.
 */
export async function getOwnCertificateById(id: string): Promise<Certificate | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const snap = await adminDb.collection(CERTIFICATES).doc(id).get();
  if (!snap.exists) return null;
  const data = snap.data()!;
  if (data.createdBy !== user.uid) return null;
  return { id: snap.id, ...data } as Certificate;
}

/** The vet's own issued certificates, most recent first — for the desk's "Recently issued" panel. */
export async function getRecentIssuedCertificates(
  uid: string,
  max = 4
): Promise<Array<Certificate & { templateKey: string; templateName: string }>> {
  const [certsSnap, templatesSnap] = await Promise.all([
    // Single equality filter — no composite index needed. A vet's own
    // certificate count is small enough to sort/filter/limit in code.
    adminDb.collection(CERTIFICATES).where('createdBy', '==', uid).get(),
    adminDb.collection(TEMPLATES).get(),
  ]);
  const templateById = new Map(templatesSnap.docs.map((d) => [d.id, d.data()]));

  return certsSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Certificate)
    .filter((c) => c.status === 'issued')
    .sort((a, b) => (b.issuedAt ?? '').localeCompare(a.issuedAt ?? ''))
    .slice(0, max)
    .map((c) => ({
      ...c,
      templateKey: (templateById.get(c.templateId)?.key as string) ?? '',
      templateName: (templateById.get(c.templateId)?.name as string) ?? 'Certificate',
    }));
}
