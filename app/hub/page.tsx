export const dynamic = 'force-dynamic';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { homePathForRole } from '@/lib/access';

// Role-aware entry point after login. Routes each user to their home surface.
export default async function HubPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }
  const role = (session.user as any).role;
  redirect(homePathForRole(role));
}
