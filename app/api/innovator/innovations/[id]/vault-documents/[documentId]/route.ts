export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { authorizeUser } from '@/lib/authorization';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

export async function DELETE(request: Request, { params }: { params: { id: string; documentId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const document = await prisma.vaultDocument.findFirst({ where: { id: params.documentId, innovationId: params.id, ownerId: session.user.id } });
  if (!document) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const allowed = await authorizeUser(session.user.id, 'vault.document.delete', { ownerId: document.ownerId, entityType: 'VaultDocument', resourceId: document.id });
  if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });
  await prisma.vaultDocument.update({ where: { id: document.id }, data: { active: false } });
  await logAudit({ userId: session.user.id, action: 'VAULT_DOCUMENT_RETIRED', entityType: 'VaultDocument', entityId: document.id, outcome: 'SUCCESS', request });
  return NextResponse.json({ retired: true });
}
