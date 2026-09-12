'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { adminDb } from '@/lib/firebase/admin';
import { getCurrentUser } from '@/lib/auth/session';
import { getProfile, updateVetProfile } from '@/lib/auth/profile';
import type { Certificate, CertificateData } from './types';

const vetProfileSchema = z.object({
  fullName: z.string().trim().max(200),
  designation: z.string().trim().max(200),
  registrationNo: z.string().trim().max(100),
  institution: z.string().trim().max(300),
  mandal: z.string().trim().max(200),
  district: z.string().trim().max(200),
});

const certificateDataSchema = z.record(z.string(), z.string().max(5000));

export interface SaveDraftInput {
  certificateId: string | null;
  templateId: string;
  data: CertificateData;
  profile: z.infer<typeof vetProfileSchema>;
}

const CERTIFICATES = 'certificates';
const TEMPLATES = 'certificateTemplates';
const PROFILES = 'profiles';
const COUNTERS = 'certificateNumberCounters';

function toCertificate(id: string, data: FirebaseFirestore.DocumentData): Certificate {
  return { id, ...data } as Certificate;
}

export async function saveDraftCertificate(input: SaveDraftInput): Promise<Certificate> {
  const profile = vetProfileSchema.parse(input.profile);
  const data = certificateDataSchema.parse(input.data);

  const user = await getCurrentUser();
  if (!user) throw new Error('Not signed in.');

  await updateVetProfile(user.uid, profile);

  const now = new Date().toISOString();

  if (input.certificateId) {
    const ref = adminDb.collection(CERTIFICATES).doc(input.certificateId);
    const snap = await ref.get();
    if (!snap.exists) throw new Error('Certificate not found.');
    const existing = snap.data()!;
    if (existing.createdBy !== user.uid) throw new Error('Not permitted to edit this certificate.');
    if (existing.status !== 'draft') throw new Error('This certificate is no longer a draft.');

    await ref.update({ data, updatedAt: now });
    const updated = await ref.get();
    return toCertificate(updated.id, updated.data()!);
  }

  const ref = await adminDb.collection(CERTIFICATES).add({
    templateId: input.templateId,
    data,
    number: null,
    status: 'draft',
    cancelledReason: null,
    cancelledAt: null,
    createdBy: user.uid,
    issuedBy: null,
    issuedAt: null,
    createdAt: now,
    updatedAt: now,
  });
  revalidatePath('/desk');
  const created = await ref.get();
  return toCertificate(created.id, created.data()!);
}

export async function issueCertificate(certificateId: string): Promise<Certificate> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not signed in.');

  const certRef = adminDb.collection(CERTIFICATES).doc(certificateId);

  const result = await adminDb.runTransaction(async (tx) => {
    const certSnap = await tx.get(certRef);
    if (!certSnap.exists) throw new Error('Certificate not found.');
    const cert = certSnap.data()!;

    if (cert.createdBy !== user.uid) throw new Error('Not permitted to issue this certificate.');
    if (cert.status === 'issued') return toCertificate(certSnap.id, cert); // idempotent, matches the old SQL function's behavior
    if (cert.status === 'cancelled') throw new Error('A cancelled certificate cannot be issued.');

    const templateRef = adminDb.collection(TEMPLATES).doc(cert.templateId);
    const templateSnap = await tx.get(templateRef);
    if (!templateSnap.exists) throw new Error('Certificate template not found.');
    const template = templateSnap.data()!;

    const profileRef = adminDb.collection(PROFILES).doc(user.uid);
    const profileSnap = await tx.get(profileRef);
    const registrationNo = (profileSnap.data()?.registrationNo as string | null) ?? '';

    // One counter per template per year, incremented atomically inside this
    // transaction — the Firestore equivalent of the old Postgres upsert.
    const year = new Date().getFullYear();
    const counterRef = adminDb.collection(COUNTERS).doc(`${cert.templateId}_${year}`);
    const counterSnap = await tx.get(counterRef);
    const nextSeq = counterSnap.exists ? (counterSnap.data()!.nextSeq as number) : 1;

    const reg = registrationNo.replace(/[^A-Za-z0-9]/g, '').toUpperCase() || 'REG';
    const number = `${template.numberPrefix}/${year}/${reg}/${String(nextSeq).padStart(4, '0')}`;
    const now = new Date().toISOString();

    tx.set(counterRef, { nextSeq: nextSeq + 1 }, { merge: true });
    tx.update(certRef, { status: 'issued', number, issuedBy: user.uid, issuedAt: now, updatedAt: now });

    return toCertificate(certSnap.id, { ...cert, status: 'issued', number, issuedBy: user.uid, issuedAt: now, updatedAt: now });
  });

  revalidatePath('/desk');
  return result;
}

export async function cancelCertificate(certificateId: string, reason: string): Promise<Certificate> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not signed in.');

  const certRef = adminDb.collection(CERTIFICATES).doc(certificateId);
  const snap = await certRef.get();
  if (!snap.exists) throw new Error('Certificate not found.');
  const cert = snap.data()!;

  const profile = await getProfile(user.uid);
  const isEditor = profile?.role === 'editor' || profile?.role === 'admin';
  if (cert.createdBy !== user.uid && !isEditor) throw new Error('Not permitted to cancel this certificate.');

  const now = new Date().toISOString();
  const cancelledReason = reason.trim().slice(0, 500);
  await certRef.update({ status: 'cancelled', cancelledReason, cancelledAt: now, updatedAt: now });
  revalidatePath('/desk');
  const updated = await certRef.get();
  return toCertificate(updated.id, updated.data()!);
}
