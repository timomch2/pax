import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { Container } from '@/components/layouts/container';
import { PageHeader } from '@/components/layouts/page-header';
import { ServiceProfileForm } from '@/components/profile/service-profile-form';
import { RegulatoryDisclaimer } from '@/components/regulatory-disclaimer';
export const dynamic = 'force-dynamic';
export default async function MarketplaceProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login?callbackUrl=/marketplace/profile');
  return <Container className="space-y-6"><PageHeader title="My Market Profile" description="Manage your business and procurement contacts. Your vendor and buyer registrations remain separate." /><ServiceProfileForm service="vendor" /><ServiceProfileForm service="buyer" /><RegulatoryDisclaimer /></Container>;
}
