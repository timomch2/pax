export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { authorizeUser } from '@/lib/authorization';
import { prisma } from '@/lib/db';
import { enqueueNotification } from '@/lib/notification-service';
import { logAudit } from '@/lib/audit';
import { VAULT_NDA_SLUG, vaultNdaHash } from '@/lib/vault-nda';

const requestSchema = z.object({
  innovationId: z.string().cuid(),
  accepted: z.literal(true),
  typedName: z.string().trim().min(2).max(160),
  templateVersion: z.number().int().positive(),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();

function normalizedName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-KE');
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const allowed = await authorizeUser(session.user.id, 'vault.access.request', { ownerId: session.user.id, entityType: 'VaultAccessRequest' });
  if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid NDA acceptance' }, { status: 400 });

  const [innovation, user, template] = await Promise.all([
    prisma.innovation.findUnique({ where: { id: parsed.data.innovationId }, select: { id: true, ownerId: true, status: true, title: true, owner: { select: { email: true } } } }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, email: true, organization: true } }),
    prisma.ndaTemplate.findFirst({ where: { slug: VAULT_NDA_SLUG, version: parsed.data.templateVersion, active: true, effectiveAt: { lte: new Date() } } }),
  ]);
  if (!innovation) return NextResponse.json({ error: 'Innovation not found' }, { status: 404 });
  if (!user || normalizedName(user.name) !== normalizedName(parsed.data.typedName)) return NextResponse.json({ error: 'Typed name must match your verified account name' }, { status: 400 });
  if (innovation.ownerId === session.user.id) return NextResponse.json({ error: 'You are the owner of this innovation' }, { status: 400 });
  if (!template || template.contentHash !== parsed.data.contentHash || vaultNdaHash(template.body) !== template.contentHash) {
    return NextResponse.json({ error: 'The NDA changed. Reload and review the current version.' }, { status: 409 });
  }

  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null;
  const userAgent = request.headers.get('user-agent') || null;
  const acceptedAt = new Date();
  const created = await prisma.$transaction(async (tx) => {
    const accessRequest = await tx.vaultAccessRequest.create({
      data: {
        innovationId: innovation.id,
        requesterId: session.user.id,
        status: 'NDA_SIGNED',
        ndaSignedAt: acceptedAt,
        ndaIpAddress: ipAddress,
        ndaSnapshot: JSON.stringify({ templateId: template.id, version: template.version, contentHash: template.contentHash, innovationId: innovation.id, accountEmail: user.email, typedName: parsed.data.typedName, acceptedAt: acceptedAt.toISOString() }),
      },
    });
    await tx.ndaAcceptance.create({
      data: {
        accessRequestId: accessRequest.id, templateId: template.id, acceptorId: session.user.id,
        typedName: parsed.data.typedName, accountEmail: user.email, organization: user.organization,
        innovationId: innovation.id, contentHash: template.contentHash, acceptedAt, ipAddress, userAgent,
      },
    });
    await enqueueNotification(tx, {
      userId: innovation.ownerId,
      templateSlug: 'vault.access-request',
      recipient: innovation.owner.email,
      variables: { requesterName: user.name, ndaVersion: template.version, innovationTitle: innovation.title },
      idempotencyKey: `vault-request:${accessRequest.id}`,
    });
    return accessRequest;
  }).catch(() => null);
  if (!created) return NextResponse.json({ error: 'You have already requested access' }, { status: 409 });
  await logAudit({ userId: session.user.id, actorEmail: user.email, action: 'VAULT_NDA_ACCEPTED', entityType: 'VaultAccessRequest', entityId: created.id, outcome: 'SUCCESS', request, context: { innovationId: innovation.id, templateVersion: template.version, contentHash: template.contentHash } });
  return NextResponse.json({ request: created }, { status: 201 });
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const innovationId = new URL(request.url).searchParams.get('innovationId');
  if (!innovationId) return NextResponse.json({ error: 'Missing innovationId' }, { status: 400 });
  const accessRequest = await prisma.vaultAccessRequest.findUnique({
    where: { innovationId_requesterId: { innovationId, requesterId: session.user.id } },
    select: { id: true, status: true, ndaSignedAt: true, innovatorApprovedAt: true, innovatorDeniedAt: true, denialReason: true },
  });
  return NextResponse.json({ request: accessRequest });
}
