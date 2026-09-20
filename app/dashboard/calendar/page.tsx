import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { expandedPracticePath } from '@/lib/practice-legacy';
import { redirect } from 'next/navigation';
import { CalendarContent } from '@/components/dashboard/calendar-content';

export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.id && await expandedPracticePath(session.user.id)) redirect('/practice/calendar');

  return <CalendarContent />;
}
