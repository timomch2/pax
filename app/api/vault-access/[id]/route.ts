export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { authorizeUser } from '@/lib/authorization';
import { prisma } from '@/lib/db';
import { enqueueNotification } from '@/lib/notification-service';
import { logAudit } from '@/lib/audit';

const decisionSchema = z.object({
  action: z.enum(['approve', 'deny', 'revoke']),
  denialReason: z.string().trim().min(5).max(2_000).optional(),
}).strict().superRefine((value, context) => {
  if (value.action === 'deny' && !value.denialReason) context.addIssue({ code: 'custom', path: ['denialReason'], message: 'A denial reason is required' });
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const accessRequest = await prisma.vaultAccessRequest.findUnique({
    where: { id: params.id },
    include: { innovation: { select: { ownerId: true, title: true } }, requester: { select: { id: true, email: true } }, ndaAcceptance: { select: { id: true } } },
  });
  if (!accessRequest || accessRequest.innovation.ownerId !== session.user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const allowed = await authorizeUser(session.user.id, 'vault.access.review', { ownerId: accessRequest.innovation.ownerId, entityType: 'VaultAccessRequest', resourceId: accessRequest.id });
  if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });
  const parsed = decisionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid access decision', issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  if (parsed.data.action === 'approve' && (!accessRequest.ndaAcceptance || accessRequest.status !== 'NDA_SIGNED')) {
    return NextResponse.json({ error: 'A current recorded NDA acceptance is required' }, { status: 409 });
  }
  if (parsed.data.action === 'revoke' && accessRequest.status !== 'APPROVED') return NextResponse.json({ error: 'Only approved access can be revoked' }, { status: 409 });
  if (parsed.data.action === 'deny' && !['NDA_SIGNED', 'APPROVED'].includes(accessRequest.status)) return NextResponse.json({ error: 'Request cannot be denied in its current state' }, { status: 409 });

  const decision = parsed.data.action === 'approve' ? 'approved' : parsed.data.action === 'deny' ? 'denied' : 'revoked';
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.vaultAccessRequest.update({
      where: { id: accessRequest.id },
      data: parsed.data.action === 'approve'
        ? { status: 'APPROVED', innovatorApprovedAt: new Date(), innovatorDeniedAt: null, denialReason: null }
        : parsed.data.action === 'deny'
          ? { status: 'DENIED', innovatorDeniedAt: new Date(), denialReason: parsed.data.denialReason }
          : { status: 'REVOKED' },
    });
    await enqueueNotification(tx, {
      userId: accessRequest.requester.id,
      templateSlug: 'vault.access-decision',
      recipient: accessRequest.requester.email,
      variables: { decision, innovationTitle: accessRequest.innovation.title },
      idempotencyKey: `vault-decision:${accessRequest.id}:${decision}:${result.updatedAt.toISOString()}`,
    });
    return result;
  });
  await logAudit({ userId: session.user.id, action: 'VAULT_ACCESS_DECIDED', entityType: 'VaultAccessRequest', entityId: updated.id, outcome: 'SUCCESS', request, context: { decision } });
  return NextResponse.json({ request: updated });
}
