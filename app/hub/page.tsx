export const dynamic = 'force-dynamic';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { productUrl } from '@/lib/product-hosts';

// Shared Home after login; individual workspaces retain their role-aware destinations.
export default async function HubPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/login');
  }
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id }, select: { registrationVersion: true, accountOnboardingCompletedAt: true, accountWelcomePending: true } });
  if (user.registrationVersion === 1 && !user.accountOnboardingCompletedAt) redirect(productUrl('accounts', '/account/onboarding'));
  if (user.accountWelcomePending) redirect(productUrl('accounts', '/account'));
  redirect(productUrl('main', '/dashboard/feed'));
}
