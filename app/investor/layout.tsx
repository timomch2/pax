export const dynamic = 'force-dynamic';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { InvestorShell } from '@/components/investor/investor-shell';
import { ManifestoGate } from '@/components/investor/manifesto-gate';
import { hasRole } from '@/lib/access';

export default async function InvestorLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }
  const { role, additionalRoles } = session.user as { role?: string; additionalRoles?: string[] };
  if (!hasRole(role, additionalRoles, 'INVESTOR')) {
    redirect('/hub');
  }
  return (
    <InvestorShell>
      <ManifestoGate>{children}</ManifestoGate>
    </InvestorShell>
  );
}
