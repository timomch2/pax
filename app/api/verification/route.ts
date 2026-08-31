export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/authorization';
import { z } from 'zod';

const submitSchema = z.object({
  requestedLevel: z.enum(['IDENTITY_VERIFIED', 'EXPERT_VERIFIED']),
  documents: z.array(z.object({
    docType: z.enum(['NATIONAL_ID', 'PASSPORT', 'PROFESSIONAL_LICENSE', 'BOARD_CERTIFICATE', 'PEER_LETTER', 'OTHER']),
    fileName: z.string().trim().min(1).max(255),
    uploadAssetId: z.string().uuid(),
    contentType: z.string().trim().min(1).max(200),
  }).strict()).min(1).max(10),
  peerVouchers: z.array(z.object({ name: z.string().trim().min(2).max(120), email: z.string().trim().email().max(320), relationship: z.string().trim().max(240) }).strict()).max(10).optional(),
}).strict();

// GET — my current verification status + requests
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        emailVerified: true,
        verificationLevel: true,
        tier: true,
      },
    });

    const requests = await prisma.verificationRequest.findMany({
      where: { userId: session.user.id },
      include: { documents: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ user, requests });
  } catch (err: unknown) {
    console.error('Verification status error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// POST — submit a verification request
export async function POST(req: NextRequest) {
  try {
    const auth = await requirePermission('verification.request', {}, req);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const parsed = submitSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid verification request', details: parsed.error.flatten() }, { status: 400 });
    const { requestedLevel, documents, peerVouchers } = parsed.data;

    // Check user has email verified for identity request
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { emailVerified: true, verificationLevel: true, tier: true },
    });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Must have email verified to request identity
    if (requestedLevel === 'IDENTITY_VERIFIED' && !user.emailVerified) {
      return NextResponse.json({ error: 'Email must be verified first' }, { status: 400 });
    }

    // Must have identity verified to request expert
    if (requestedLevel === 'EXPERT_VERIFIED' && user.verificationLevel !== 'IDENTITY_VERIFIED') {
      return NextResponse.json({ error: 'Identity must be verified first' }, { status: 400 });
    }

    // Check for existing pending request at the same level
    const existing = await prisma.verificationRequest.findFirst({
      where: { userId: auth.userId, requestedLevel, status: 'PENDING' },
    });
    if (existing) {
      return NextResponse.json({ error: 'You already have a pending request for this level' }, { status: 409 });
    }

    if (requestedLevel === 'EXPERT_VERIFIED' && (!peerVouchers || peerVouchers.length < 2)) {
      return NextResponse.json({ error: 'At least 2 peer vouchers are required for Expert verification' }, { status: 400 });
    }

    const assets = await prisma.uploadAsset.findMany({
      where: { id: { in: documents.map((document) => document.uploadAssetId) }, ownerId: auth.userId, purpose: 'VERIFICATION_DOCUMENT', status: 'CLEAN' },
    });
    if (assets.length !== documents.length) return NextResponse.json({ error: 'One or more documents are unavailable, unsafe, or not owned by you' }, { status: 400 });
    const byId = new Map(assets.map((asset) => [asset.id, asset]));

    const verificationRequest = await prisma.verificationRequest.create({
      data: {
        userId: auth.userId,
        requestedLevel,
        peerVouchers: peerVouchers ? JSON.stringify(peerVouchers) : null,
        documents: {
          create: documents.map((d) => ({
            docType: d.docType,
            fileName: byId.get(d.uploadAssetId)!.originalFileName,
            cloudStoragePath: byId.get(d.uploadAssetId)!.objectKey,
            contentType: byId.get(d.uploadAssetId)!.actualContentType || byId.get(d.uploadAssetId)!.expectedContentType,
            uploadAssetId: d.uploadAssetId,
          })),
        },
      },
      include: { documents: true },
    });

    return NextResponse.json(verificationRequest, { status: 201 });
  } catch (err: unknown) {
    console.error('Verification submit error:', err);
    return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 });
  }
}
