import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { guardServiceEntry } from '@/lib/service-setup';
export const dynamic = 'force-dynamic';
import { MarketplaceShell } from '@/components/marketplace/marketplace-shell';

export default async function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) await guardServiceEntry(session.user.id, 'market');
  return <MarketplaceShell>{children}</MarketplaceShell>;
}
