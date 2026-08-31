import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { AdminShell } from '@/components/admin/admin-shell';
import { AdminModerationQueue } from '@/components/admin/admin-moderation';

export const dynamic = 'force-dynamic';

export default async function ModerationPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');
  if ((session.user as any).role !== 'ADMIN') redirect('/hub');
  return (
    <AdminShell>
      <AdminModerationQueue />
    </AdminShell>
  );
}
