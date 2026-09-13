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

export type CertificateWithTemplate = Certificate & { templateKey: string; templateName: string };

/**
 * Every certificate the vet has ever started, with its template joined in.
 * Single equality filter — no composite index needed; a vet's own
 * certificate count is small enough to sort/filter in code.
 */
async function getAllOwnCertificates(uid: string): Promise<CertificateWithTemplate[]> {
  const [certsSnap, templatesSnap] = await Promise.all([
    adminDb.collection(CERTIFICATES).where('createdBy', '==', uid).get(),
    adminDb.collection(TEMPLATES).get(),
  ]);
  const templateById = new Map(templatesSnap.docs.map((d) => [d.id, d.data()]));

  return certsSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Certificate)
    .map((c) => ({
      ...c,
      templateKey: (templateById.get(c.templateId)?.key as string) ?? '',
      templateName: (templateById.get(c.templateId)?.name as string) ?? 'Certificate',
    }));
}

/** The vet's own issued certificates, most recent first — for the desk's "Recently issued" panel. */
export async function getRecentIssuedCertificates(uid: string, max = 4): Promise<CertificateWithTemplate[]> {
  const all = await getAllOwnCertificates(uid);
  return all
    .filter((c) => c.status === 'issued')
    .sort((a, b) => (b.issuedAt ?? '').localeCompare(a.issuedAt ?? ''))
    .slice(0, max);
}

/** Every certificate the vet has started (draft, issued or cancelled), most recently updated first — the "Saved" list. */
export async function getMyCertificates(uid: string): Promise<CertificateWithTemplate[]> {
  const all = await getAllOwnCertificates(uid);
  return all.sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
}

export interface VerifiedCertificate {
  number: string;
  templateName: string;
  issuedAt: string | null;
  owner: string;
  species: string;
  tag: string;
  vetName: string;
  institution: string;
}

/**
 * The public /verify lookup: only ever returns something for a genuinely
 * *issued* certificate, never a draft or cancelled one, regardless of
 * whether the number happens to match.
 */
export async function getCertificateByNumber(number: string): Promise<VerifiedCertificate | null> {
  const trimmed = number.trim().toUpperCase();
  if (!trimmed) return null;

  const snap = await adminDb.collection(CERTIFICATES).where('number', '==', trimmed).limit(1).get();
  if (snap.empty) return null;
  const cert = snap.docs[0].data();
  if (cert.status !== 'issued') return null;

  const [templateSnap, profileSnap] = await Promise.all([
    adminDb.collection(TEMPLATES).doc(cert.templateId).get(),
    cert.issuedBy ? adminDb.collection('profiles').doc(cert.issuedBy).get() : Promise.resolve(null),
  ]);

  return {
    number: cert.number,
    templateName: (templateSnap.data()?.name as string) ?? 'Certificate',
    issuedAt: cert.issuedAt ?? null,
    owner: cert.data?.owner ?? '',
    species: cert.data?.species ?? '',
    tag: cert.data?.tag ?? '',
    vetName: (profileSnap?.data()?.fullName as string) ?? '',
    institution: (profileSnap?.data()?.institution as string) ?? '',
  };
}
