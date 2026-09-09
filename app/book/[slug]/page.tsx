import { Container } from '@/components/layouts/container';
import { PageHeader } from '@/components/layouts/page-header';
import { PublicPracticeBooking } from '@/components/hub/practice-bookings';
export const dynamic = 'force-dynamic';
export default function BookingPage({ params }: { params: { slug: string } }) {
  return <Container><PageHeader title="Request an appointment" description="Choose an available time and verify your email." /><PublicPracticeBooking slug={params.slug} /></Container>;
}
