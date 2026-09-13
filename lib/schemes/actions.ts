'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { adminDb, adminStorage } from '@/lib/firebase/admin';
import { getCurrentUser } from '@/lib/auth/session';
import { SCHEME_TAGS } from './types';

const MAX_FILE_BYTES = 10 * 1024 * 1024;

const addSchemeSchema = z.object({
  name: z.string().trim().min(1, 'Add a form name.').max(200),
  tag: z.enum(SCHEME_TAGS),
  description: z.string().trim().max(500),
});

/** Requires sign-in. Uploads the file (if any) to Storage server-side, then makes it public — Storage Rules stay deny-all since only the Admin SDK ever writes here. */
export async function addScheme(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Please sign in to add a form.');

  const parsed = addSchemeSchema.parse({
    name: formData.get('name'),
    tag: formData.get('tag'),
    description: formData.get('description'),
  });

  const file = formData.get('file');
  let fileUrl: string | null = null;
  let fileName: string | null = null;

  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_FILE_BYTES) throw new Error('File is too large (max 10 MB).');

    try {
      const bucket = adminStorage.bucket();
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const path = `schemes/${Date.now()}-${safeName}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      const storageFile = bucket.file(path);
      await storageFile.save(buffer, { contentType: file.type || 'application/octet-stream' });
      await storageFile.makePublic();
      fileUrl = `https://storage.googleapis.com/${bucket.name}/${path}`;
      fileName = file.name;
    } catch {
      // Most commonly: Firebase Storage hasn't been enabled for this project
      // yet (Console -> Storage -> Get started) — a separate step from
      // creating the Firestore database, easy to miss.
      throw new Error(
        'Could not upload the file. Check that Firebase Storage is enabled for this project ' +
          '(Firebase console → Storage → Get started), then try again.'
      );
    }
  }

  await adminDb.collection('schemes').add({
    ...parsed,
    fileUrl,
    fileName,
    createdBy: user.uid,
    createdAt: new Date().toISOString(),
  });

  revalidatePath('/schemes');
}

const applySchemeSchema = z.object({
  schemeId: z.string().min(1),
  applicantName: z.string().trim().min(1, "Add the applicant's name."),
  mobile: z.string().trim().max(20),
  village: z.string().trim().max(200),
  animalCount: z.string().trim().max(10),
});

export type ApplySchemeInput = z.infer<typeof applySchemeSchema>;

/** Requires sign-in — a lead capture stored under the vet who took it down. */
export async function submitSchemeApplication(input: ApplySchemeInput): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Please sign in to fill an application.');

  const parsed = applySchemeSchema.parse(input);
  await adminDb.collection('schemeApplications').add({
    ...parsed,
    createdBy: user.uid,
    createdAt: new Date().toISOString(),
  });
}
