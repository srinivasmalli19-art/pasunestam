import { notFound } from 'next/navigation';
import CertificateBuilder from '@/components/certificates/CertificateBuilder';
import { getCurrentUser } from '@/lib/auth/session';
import { getOwnCertificateById, getPublishedTemplates, getTemplateByKey, getVetProfile } from '@/lib/certificates/queries';

// Public — no requireUser() here. Filling, previewing, printing and issuing
// a certificate all work without an account; only "Save draft" is gated,
// inline inside CertificateBuilder itself (see its `signedIn` prop).
export default async function NewCertificatePage(props: PageProps<'/certificates/new/[key]'>) {
  const { key } = await props.params;
  const searchParams = await props.searchParams;
  const draftId = typeof searchParams.draft === 'string' ? searchParams.draft : null;
  const initialVariant = searchParams.variant === 'health-only' ? 'health-only' : 'full';

  const [user, template, templates, profile] = await Promise.all([
    getCurrentUser(),
    getTemplateByKey(key),
    getPublishedTemplates(),
    getVetProfile(),
  ]);
  if (!template) notFound();

  // getOwnCertificateById already returns null for a signed-out visitor or
  // for an id that isn't this vet's own — a stray ?draft= never leaks data.
  const draft = draftId ? await getOwnCertificateById(draftId) : null;

  return (
    <CertificateBuilder
      template={template}
      templates={templates}
      profile={profile}
      signedIn={!!user}
      initialData={draft?.data ?? {}}
      initialAnimals={draft?.animals ?? []}
      initialVariant={initialVariant}
      certificateId={draft?.id ?? null}
      status={draft?.status ?? 'draft'}
      number={draft?.number ?? null}
    />
  );
}
