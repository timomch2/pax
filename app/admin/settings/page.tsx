export const dynamic = 'force-dynamic';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AdminSettings } from '@/components/admin/admin-settings';

export default async function AdminSettingsPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  return <AdminSettings name={user?.name ?? ''} email={user?.email ?? ''} />;
}
