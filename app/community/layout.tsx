import { guardServiceEntry } from '@/lib/service-setup';
export const dynamic = 'force-dynamic';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { KnowledgeShell } from '@/components/knowledge/knowledge-shell';

export default async function CommunityLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  await guardServiceEntry(session.user.id, 'community');
  return <KnowledgeShell>{children}</KnowledgeShell>;
}
