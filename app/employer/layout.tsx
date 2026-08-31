export const dynamic = 'force-dynamic';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { EmployerShell } from '@/components/employer/employer-shell';
import { hasRole } from '@/lib/access';

export default async function EmployerLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }
  const { role, additionalRoles } = session.user as { role?: string; additionalRoles?: string[] };
  if (!hasRole(role, additionalRoles, 'EMPLOYER')) {
    redirect('/hub');
  }
  return <EmployerShell>{children}</EmployerShell>;
}
