import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { expandedPracticePath } from '@/lib/practice-legacy';
import { redirect } from 'next/navigation';
import { BillingContent } from '@/components/dashboard/billing-content';

export const dynamic = 'force-dynamic';

export default async function BillingPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.id && await expandedPracticePath(session.user.id)) redirect('/practice/billing');

  return <BillingContent />;
}
