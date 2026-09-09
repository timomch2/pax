import { Container } from '@/components/layouts/container';
import { PageHeader } from '@/components/layouts/page-header';
import { FacilityAdministration } from '@/components/admin/facility-administration';
export const dynamic = 'force-dynamic';
export default function FacilitiesAdminPage() {
  return <Container><PageHeader title="Health facilities" description="Import the national directory and review shared facility corrections." /><FacilityAdministration /></Container>;
}
