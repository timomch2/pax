import { Container } from '@/components/layouts/container';
import { PageHeader } from '@/components/layouts/page-header';
import { ServiceProfileForm } from '@/components/profile/service-profile-form';
export default function PracticeProfilePage() {
  return <Container><PageHeader title="My Practice Profile" description="Your clinical specialty, facility, fees and professional affiliations." /><ServiceProfileForm service="practice" /></Container>;
}
