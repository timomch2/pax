export const dynamic = 'force-dynamic';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/authorization';
import { hasTier } from '@/lib/access';

export default async function HubLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');
  const access = await requirePermission('hub.invoice.read');
  if (!access.ok) return <p role="alert">You do not have access to Practice Finance.</p>;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, tier: true, hubMember: true },
  });
  const isPractitioner = user?.role === 'PRACTITIONER' || user?.role === 'ADMIN';
  if (!isPractitioner) redirect('/dashboard');
  const eligible = user?.role === 'ADMIN' || hasTier(user?.tier as any, 'TIER2_PROFESSIONAL');
  const member = user?.role === 'ADMIN' || (eligible && user?.hubMember);
  // Not yet a paid + joined member → send to the dashboard where the Join card lives.
  if (!member) redirect('/dashboard');
  return <>{children}</>;
}
