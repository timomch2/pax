import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { PracticeShell } from '@/components/hub/practice-shell';
export const dynamic = 'force-dynamic';
export default async function PracticeLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');
  return <PracticeShell>{children}</PracticeShell>;
}
