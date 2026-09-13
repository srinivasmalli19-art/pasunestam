import CasesBrowser from '@/components/cases/CasesBrowser';
import { getCurrentUser } from '@/lib/auth/session';
import { getPublishedCases } from '@/lib/cases/queries';

export default async function CasesPage() {
  const [user, cases] = await Promise.all([getCurrentUser(), getPublishedCases()]);
  const issueMonth = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return <CasesBrowser cases={cases} isSignedIn={Boolean(user)} issueMonth={issueMonth} />;
}
