import { talentEnabled, productUrl } from '@/lib/product-hosts';
export const dynamic = 'force-dynamic';

import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { Container } from '@/components/layouts/container';
import { PageHeader } from '@/components/layouts/page-header';
import { JobBoard } from '@/components/employer/job-board';

export default async function JobsPage() {
  if (talentEnabled()) redirect(productUrl('talent', '/talent'));
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login?callbackUrl=/jobs');
  return <Container className="space-y-6 py-8"><PageHeader title="Public health roles" description="Apply using your PAX evidence and verified professional record." /><JobBoard /></Container>;
}
