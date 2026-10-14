import { adminDb } from '@/lib/firebase/admin';

export type UserRole = 'vet' | 'editor' | 'admin';

export interface Profile {
  uid: string;
  fullName: string | null;
  phone: string | null;
  role: UserRole;
  designation: string;
  registrationNo: string | null;
  institution: string | null;
  mandal: string | null;
  district: string | null;
  createdAt: string;
}

const COLLECTION = 'profiles';

export async function getProfile(uid: string): Promise<Profile | null> {
  const snap = await adminDb.collection(COLLECTION).doc(uid).get();
  if (!snap.exists) return null;
  return { uid, ...snap.data() } as Profile;
}

/** Creates the profile document a new sign-up needs — the direct replacement for the old Postgres `handle_new_user()` trigger. */
export async function createProfile(uid: string, fullName: string): Promise<void> {
  const profile: Omit<Profile, 'uid'> = {
    fullName: fullName || null,
    phone: null,
    role: 'vet',
    designation: 'Veterinary Assistant Surgeon',
    registrationNo: null,
    institution: null,
    mandal: null,
    district: null,
    createdAt: new Date().toISOString(),
  };
  await adminDb.collection(COLLECTION).doc(uid).set(profile);
}

export interface VetProfileUpdate {
  fullName: string;
  designation: string;
  registrationNo: string;
  institution: string;
  mandal: string;
  district: string;
}

export async function updateVetProfile(uid: string, update: VetProfileUpdate): Promise<void> {
  await adminDb
    .collection(COLLECTION)
    .doc(uid)
    .set(
      {
        fullName: update.fullName || null,
        designation: update.designation || 'Veterinary Assistant Surgeon',
        registrationNo: update.registrationNo || null,
        institution: update.institution || null,
        mandal: update.mandal || null,
        district: update.district || null,
      },
      { merge: true }
    );
}

/**
 * Creates or updates the profile of an SLC staff account (editor/admin) at
 * each SLC sign-in, so the role always matches what SLC Central Admin grants.
 */
export async function upsertSlcProfile(
  uid: string,
  fullName: string | null,
  role: Extract<UserRole, 'admin' | 'editor'>
): Promise<void> {
  const ref = adminDb.collection(COLLECTION).doc(uid);
  const snap = await ref.get();
  if (!snap.exists) {
    const profile: Omit<Profile, 'uid'> = {
      fullName,
      phone: null,
      role,
      designation: role === 'admin' ? 'Administrator' : 'Editor',
      registrationNo: null,
      institution: null,
      mandal: null,
      district: null,
      createdAt: new Date().toISOString(),
    };
    await ref.set(profile);
    return;
  }
  await ref.set({ role, ...(fullName ? { fullName } : {}) }, { merge: true });
}
