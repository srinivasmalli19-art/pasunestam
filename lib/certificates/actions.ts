'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { CertificateData } from './types';

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

export async function saveDraftCertificate(input: SaveDraftInput) {
  const profile = vetProfileSchema.parse(input.profile);
  const data = certificateDataSchema.parse(input.data);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in.');

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      full_name: profile.fullName || null,
      designation: profile.designation || 'Veterinary Assistant Surgeon',
      registration_no: profile.registrationNo || null,
      institution: profile.institution || null,
      mandal: profile.mandal || null,
      district: profile.district || null,
    })
    .eq('id', user.id);
  if (profileError) throw new Error(profileError.message);

  if (input.certificateId) {
    const { data: cert, error } = await supabase
      .from('certificates')
      .update({ data })
      .eq('id', input.certificateId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return cert;
  }

  const { data: cert, error } = await supabase
    .from('certificates')
    .insert({ template_id: input.templateId, data, created_by: user.id })
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath('/desk');
  return cert;
}

export async function issueCertificate(certificateId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('issue_certificate', { p_certificate_id: certificateId });
  if (error) throw new Error(error.message);
  revalidatePath('/desk');
  return data;
}

export async function cancelCertificate(certificateId: string, reason: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('cancel_certificate', {
    p_certificate_id: certificateId,
    p_reason: reason.trim().slice(0, 500),
  });
  if (error) throw new Error(error.message);
  revalidatePath('/desk');
  return data;
}
