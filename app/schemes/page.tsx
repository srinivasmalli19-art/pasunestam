import SchemesBrowser from '@/components/schemes/SchemesBrowser';
import { getCurrentUser } from '@/lib/auth/session';
import { getSchemes } from '@/lib/schemes/queries';

export default async function SchemesPage() {
  const [user, schemes] = await Promise.all([getCurrentUser(), getSchemes()]);
  return <SchemesBrowser schemes={schemes} isSignedIn={Boolean(user)} />;
}
