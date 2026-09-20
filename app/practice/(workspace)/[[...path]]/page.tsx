import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Container } from '@/components/layouts/container';
import { PageHeader } from '@/components/layouts/page-header';
import { PracticeWorkspaceView } from '@/components/hub/practice-workspace';
import { PRACTICE_SECTIONS, type PracticeSection } from '@/lib/practice-routes';
import { BillingContent } from '@/components/dashboard/billing-content';
import { CalendarContent } from '@/components/dashboard/calendar-content';
import { PatientsContent } from '@/components/dashboard/patients-content';
import { practiceNavigationMode } from '@/lib/practice-navigation';

export const dynamic = 'force-dynamic';
export default async function PracticePage({ params }: { params: { path?: string[] } }) {
  const path = `/practice${params.path?.length ? `/${params.path.join('/')}` : ''}`;
  const section = (Object.entries(PRACTICE_SECTIONS).find(([, item]) => item.path === path)?.[0]) as PracticeSection | undefined;
  if (!section) notFound();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) notFound();
  const mode = await practiceNavigationMode(session.user.id, section);
  if (mode === 'denied') return <p role="alert">You do not have access to this Practice section.</p>;
  if (mode === 'legacy') return section === 'patients' ? <PatientsContent /> : section === 'calendar' ? <CalendarContent /> : <BillingContent />;
  return <Container><PageHeader title={section === 'facilities' ? 'Practice Workspace' : PRACTICE_SECTIONS[section].label} description="Your facilities, appointments, team, and clinical income." /><PracticeWorkspaceView section={section} /></Container>;
}
