import { notFound } from 'next/navigation';
import CertificateBuilder from '@/components/certificates/CertificateBuilder';
import { requireUser } from '@/lib/auth/session';
import { getOwnCertificateById, getPublishedTemplates, getTemplateByKey, getVetProfile } from '@/lib/certificates/queries';

export default async function NewCertificatePage(props: PageProps<'/desk/certificates/new/[key]'>) {
  const { key } = await props.params;
  await requireUser(`/desk/certificates/new/${key}`);
  const searchParams = await props.searchParams;
  const draftId = typeof searchParams.draft === 'string' ? searchParams.draft : null;
  const initialVariant = searchParams.variant === 'health-only' ? 'health-only' : 'full';

  const [template, templates, profile] = await Promise.all([
    getTemplateByKey(key),
    getPublishedTemplates(),
    getVetProfile(),
  ]);
  if (!template) notFound();

  const draft = draftId ? await getOwnCertificateById(draftId) : null;

  return (
    <CertificateBuilder
      template={template}
      templates={templates}
      profile={profile}
      initialData={draft?.data ?? {}}
      initialAnimals={draft?.animals ?? []}
      initialVariant={initialVariant}
      certificateId={draft?.id ?? null}
      status={draft?.status ?? 'draft'}
      number={draft?.number ?? null}
    />
  );
}
