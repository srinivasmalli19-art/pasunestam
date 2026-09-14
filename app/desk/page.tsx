import DeskHero from '@/components/desk/DeskHero';
import { requireUser } from '@/lib/auth/session';
import { getMonthlyReturnDue } from '@/lib/returns/due-date';
import { getPublishedTemplates, getRecentIssuedCertificates } from '@/lib/certificates/queries';

function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning, Doctor';
  if (hour < 17) return 'Good afternoon, Doctor';
  return 'Good evening, Doctor';
}

// requireUser() redirects to /login itself if the session is missing or
// invalid — don't rely on the layout alone to have caught it, since Next
// can render a layout and its page concurrently rather than strictly
// sequentially, so every protected page needs its own real check too.
export default async function DeskPage() {
  const user = await requireUser('/desk');

  const [templates, recentRaw] = await Promise.all([
    getPublishedTemplates(),
    getRecentIssuedCertificates(user.uid),
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
