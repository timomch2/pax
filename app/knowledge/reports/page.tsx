import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { KnowledgeShell } from '@/components/knowledge/knowledge-shell';
import { ConsensusReportsList } from '@/components/knowledge/consensus-reports';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');
  return (
    <KnowledgeShell>
      <ConsensusReportsList />
    </KnowledgeShell>
  );
}
