export const dynamic = 'force-dynamic';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin/admin-shell';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }
  const role = (session.user as any).role;
  // Only platform administrators may access the admin console.
  if (role !== 'ADMIN') {
    redirect('/hub');
  }
  return <AdminShell>{children}</AdminShell>;
}
