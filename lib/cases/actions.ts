'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { adminDb } from '@/lib/firebase/admin';
import { getCurrentUser } from '@/lib/auth/session';
import { getProfile } from '@/lib/auth/profile';

const submitCaseSchema = z.object({
  title: z.string().trim().min(1, 'Add a case title.').max(200),
  species: z.string().trim().min(1, 'Choose a species.'),
  body: z.string().trim().min(1, 'Add the history, findings, treatment and outcome.').max(8000),
});

export type SubmitCaseInput = z.infer<typeof submitCaseSchema>;

/** Requires sign-in — a case is submitted under the vet's own name, not anonymously. */
export async function submitCase(input: SubmitCaseInput): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Please sign in to submit a case.');

  const parsed = submitCaseSchema.parse(input);
  const profile = await getProfile(user.uid);
  const submitterName = [profile?.fullName, profile?.institution].filter(Boolean).join(', ') || user.email;

  await adminDb.collection('cases').add({
    ...parsed,
    submittedBy: user.uid,
    submitterName,
    status: 'submitted',
    createdAt: new Date().toISOString(),
  });

  revalidatePath('/cases');
}
