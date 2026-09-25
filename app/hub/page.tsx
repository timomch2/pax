export const dynamic = 'force-dynamic';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { productUrl } from '@/lib/product-hosts';

// Shared Home after login; individual workspaces retain their role-aware destinations.
export default async function HubPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/login');
  }
  redirect(productUrl('main', '/dashboard/feed'));
}
