import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { KnowledgeShell } from '@/components/knowledge/knowledge-shell';
import { DebateDetail } from '@/components/knowledge/debate-detail';

export const dynamic = 'force-dynamic';

export default async function DebateDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');
  const tier = (session.user as any).tier ?? null;
  return (
    <KnowledgeShell>
      <DebateDetail id={params.id} tier={tier} />
    </KnowledgeShell>
  );
}
