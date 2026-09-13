import CertificatesList from '@/components/certificates/CertificatesList';
import { getCurrentUser } from '@/lib/auth/session';
import { getMyCertificates } from '@/lib/certificates/queries';

export default async function SavedCertificatesPage() {
  const user = await getCurrentUser();
  const certificates = await getMyCertificates(user!.uid);

  const rows = certificates.map((c) => ({
    id: c.id,
    templateKey: c.templateKey,
    templateName: c.templateName,
    status: c.status,
    number: c.number,
    owner: c.data.owner ?? '',
    updatedAt: c.updatedAt,
  }));

  return <CertificatesList certificates={rows} />;
}
