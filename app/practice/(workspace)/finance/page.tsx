import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { expandedPracticePath } from '@/lib/practice-legacy';
import { redirect } from 'next/navigation';
export const dynamic = 'force-dynamic';
import { HubFinanceDashboard } from '@/components/hub-finance/hub-finance-dashboard';
export default async function Page() {
  const session = await getServerSession(authOptions);
  if (session?.user?.id && await expandedPracticePath(session.user.id)) redirect('/practice');

  return <HubFinanceDashboard />;
}
