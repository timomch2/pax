export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { authorizeUser } from '@/lib/authorization';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

const createSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2_000).nullable().optional(),
  assetId: z.string().cuid(),
}).strict();

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const innovation = await prisma.innovation.findUnique({ where: { id: params.id }, select: { ownerId: true } });
  if (!innovation || innovation.ownerId !== session.user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const allowed = await authorizeUser(session.user.id, 'vault.document.read', { ownerId: innovation.ownerId, entityType: 'VaultDocument', resourceId: params.id });
  if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });
  const documents = await prisma.vaultDocument.findMany({ where: { innovationId: params.id, active: true }, select: { id: true, title: true, description: true, assetId: true, createdAt: true }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ documents });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const innovation = await prisma.innovation.findUnique({ where: { id: params.id }, select: { ownerId: true } });
  if (!innovation || innovation.ownerId !== session.user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const allowed = await authorizeUser(session.user.id, 'vault.document.create', { ownerId: innovation.ownerId, entityType: 'VaultDocument', resourceId: params.id });
  if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid vault document' }, { status: 400 });
  const asset = await prisma.uploadAsset.findFirst({ where: { id: parsed.data.assetId, ownerId: session.user.id, purpose: 'VAULT_DOCUMENT', status: 'CLEAN' }, select: { id: true } });
  if (!asset) return NextResponse.json({ error: 'Document is unavailable or has not passed security review' }, { status: 400 });
  const document = await prisma.vaultDocument.create({ data: { innovationId: params.id, ownerId: session.user.id, title: parsed.data.title, description: parsed.data.description || null, assetId: asset.id } }).catch(() => null);
  if (!document) return NextResponse.json({ error: 'Document is already attached' }, { status: 409 });
  await logAudit({ userId: session.user.id, action: 'VAULT_DOCUMENT_ADDED', entityType: 'VaultDocument', entityId: document.id, outcome: 'SUCCESS', request, context: { innovationId: params.id } });
  return NextResponse.json({ document }, { status: 201 });
}
