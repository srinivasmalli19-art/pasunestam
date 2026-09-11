import { createClient } from '@/lib/supabase/server';
import type { CertificateTemplate } from './types';

export async function getTemplateByKey(key: string): Promise<CertificateTemplate | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('certificate_templates')
    .select('*')
    .eq('key', key)
    .eq('published', true)
    .single();
  return data;
}

export async function getPublishedTemplates(): Promise<Pick<CertificateTemplate, 'id' | 'key' | 'name'>[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('certificate_templates')
    .select('id,key,name')
    .eq('published', true)
    .order('name');
  return data ?? [];
}

export async function getVetProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  return data;
}

export async function getCertificateDraft(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from('certificates').select('*').eq('id', id).eq('status', 'draft').single();
  return data;
}
