import DeskHero from '@/components/desk/DeskHero';
import { getCurrentUser } from '@/lib/auth/session';
import { getMonthlyReturnDue } from '@/lib/returns/due-date';
import { getPublishedTemplates, getRecentIssuedCertificates } from '@/lib/certificates/queries';

function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning, Doctor';
  if (hour < 17) return 'Good afternoon, Doctor';
  return 'Good evening, Doctor';
}

// proxy.ts already redirects signed-out visitors to /login before this
// renders, so `user` is always present here.
export default async function DeskPage() {
  const user = await getCurrentUser();

  const [templates, recentRaw] = await Promise.all([
    getPublishedTemplates(),
    getRecentIssuedCertificates(user!.uid),
  ]);

  const recent = recentRaw.map((c) => ({
    id: c.id,
    templateKey: c.templateKey,
    templateName: c.templateName,
    number: c.number,
    owner: c.data.owner ?? '',
  }));

  return (
    <DeskHero greeting={greetingFor(new Date().getHours())} templates={templates} recent={recent} due={getMonthlyReturnDue()} />
  );
}
