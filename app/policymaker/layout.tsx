export const dynamic = 'force-dynamic';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { PolicymakerShell } from '@/components/policymaker/policymaker-shell';
import { hasRole } from '@/lib/access';

export default async function PolicymakerLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }
  const { role, additionalRoles } = session.user as { role?: string; additionalRoles?: string[] };
  if (!hasRole(role, additionalRoles, 'POLICYMAKER')) {
    redirect('/hub');
  }
  return <PolicymakerShell>{children}</PolicymakerShell>;
}
