import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { KnowledgeShell } from '@/components/knowledge/knowledge-shell';
import { StartDebateForm } from '@/components/knowledge/start-debate-form';

export const dynamic = 'force-dynamic';

export default async function StartDebatePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');
  const tier = (session.user as any).tier ?? null;
  return (
    <KnowledgeShell>
      <StartDebateForm tier={tier} />
    </KnowledgeShell>
  );
}
