import { Container } from '@/components/layouts/container';
import { PageHeader } from '@/components/layouts/page-header';
import { ServiceProfileForm } from '@/components/profile/service-profile-form';
import { GpsProfile } from '@/components/dashboard/gps-profile';
export default function CommunityProfilePage() {
  return <Container className="space-y-6"><PageHeader title="My Pax Exchange Profile" description="Introduce your public health interests, community work and documented impact." /><ServiceProfileForm service="community" /><GpsProfile /></Container>;
}
