import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { guardServiceEntry } from '@/lib/service-setup';
export default async function KnowledgeLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) await guardServiceEntry(session.user.id, 'community');
  return <>{children}</>;
}
