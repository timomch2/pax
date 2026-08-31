export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/authorization';
import { z } from 'zod';

const reviewSchema = z.object({ requestId: z.string().cuid(), action: z.enum(['approve', 'reject']), adminNotes: z.string().trim().max(5000).optional().default('') }).strict();

// GET — list verification requests (admin)
export async function GET(req: NextRequest) {
  try {
    const auth = await requirePermission('verification.review', {}, req);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const status = new URL(req.url).searchParams.get('status') || 'PENDING';

    const requests = await prisma.verificationRequest.findMany({
      where: { status: status as 'PENDING' | 'APPROVED' | 'REJECTED' },
      include: {
        user: { select: { id: true, name: true, email: true, role: true, tier: true, verificationLevel: true, paxId: true, country: true } },
        documents: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(requests);
  } catch (err: unknown) {
    console.error('Admin verification error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// PATCH — approve or reject a verification request (admin)
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requirePermission('verification.review', {}, req);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const parsed = reviewSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid review action' }, { status: 400 });
    const { requestId, action, adminNotes } = parsed.data;

    const request = await prisma.verificationRequest.findUnique({
      where: { id: requestId },
      include: { user: true, documents: { include: { uploadAsset: { include: { accessLogs: { where: { actorId: auth.userId, action: 'DOWNLOAD_URL_CREATED' }, take: 1 } } } } } },
    });
    if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (request.status !== 'PENDING') return NextResponse.json({ error: 'Already reviewed' }, { status: 409 });

    if (action === 'approve') {
      const unreviewed = request.documents.some((document) => !document.uploadAsset || document.uploadAsset.status !== 'CLEAN' || document.uploadAsset.accessLogs.length === 0);
      if (unreviewed) return NextResponse.json({ error: 'Every submitted document must be clean and reviewed before approval' }, { status: 400 });
      await prisma.$transaction([
        prisma.verificationRequest.update({
          where: { id: requestId },
          data: {
            status: 'APPROVED',
            adminNotes: adminNotes || null,
            reviewedAt: new Date(),
            reviewedBy: auth.userId,
          },
        }),
        prisma.user.update({
          where: { id: request.userId },
          data: { verificationLevel: request.requestedLevel },
        }),
      ]);
    } else {
      await prisma.verificationRequest.update({
        where: { id: requestId },
        data: {
          status: 'REJECTED',
          adminNotes: adminNotes || null,
          reviewedAt: new Date(),
          reviewedBy: auth.userId,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Admin verification action error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
