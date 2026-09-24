import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { KnowledgeShell } from '@/components/knowledge/knowledge-shell';
import { Container } from '@/components/layouts/container';
import { PageHeader } from '@/components/layouts/page-header';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Unpublished Papers | PAX Knowledge Exchange' };

export default async function UnpublishedPapersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');
  return <KnowledgeShell>
    <Container className="space-y-6 py-6">
      <PageHeader title="Unpublished Papers" description="Share research and connect theory with practice through Knowledge Exchange." />
      <section className="space-y-3 rounded-xl border bg-card p-6" aria-label="Availability">
        <Badge variant="secondary">Coming soon</Badge>
        <p className="text-muted-foreground">A dedicated space for unpublished papers is planned. Submission and publishing are not available yet.</p>
      </section>
    </Container>
  </KnowledgeShell>;
}
