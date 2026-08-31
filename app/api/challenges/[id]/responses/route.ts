export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { enqueueInAppNotification } from '@/lib/notification-service';

// POST — respond to a Challenge Brief with an optional GPS entry + a message.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const brief = await prisma.challengeBrief.findUnique({ where: { id: params.id } });
    if (!brief) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (brief.status !== 'OPEN') {
      return NextResponse.json({ error: 'This brief is closed and no longer accepting responses.' }, { status: 400 });
    }
    if (brief.authorId === session.user.id) {
      return NextResponse.json({ error: 'You cannot respond to your own brief.' }, { status: 400 });
    }
    const body = await req.json();
    const { message, gpsEntryId } = body ?? {};
    if (!message?.trim()) {
      return NextResponse.json({ error: 'A short message is required.' }, { status: 400 });
    }
    // If a GPS entry is provided, it must belong to the responder.
    if (gpsEntryId) {
      const entry = await prisma.gpsEntry.findUnique({ where: { id: gpsEntryId } });
      if (!entry || entry.userId !== session.user.id) {
        return NextResponse.json({ error: 'Invalid GPS entry.' }, { status: 400 });
      }
    }

    const existing = await prisma.challengeResponse.findUnique({
      where: { briefId_responderId: { briefId: brief.id, responderId: session.user.id } },
    });
    if (existing) {
      return NextResponse.json({ error: 'You have already responded to this brief.' }, { status: 400 });
    }

    const response = await prisma.challengeResponse.create({
      data: {
        briefId: brief.id,
        responderId: session.user.id,
        gpsEntryId: gpsEntryId || null,
        message: message.trim(),
      },
    });

    // Notify the brief's author.
    await enqueueInAppNotification(prisma, { userId: brief.authorId, templateSlug: 'challenge.response-received', variables: { responderName: session.user.name ?? 'A member', briefTitle: brief.title, briefId: brief.id }, idempotencyKey: `challenge-response:${response.id}` });

    return NextResponse.json({ response });
  } catch (error: any) {
    console.error('Challenge response POST error:', error);
    return NextResponse.json({ error: 'Failed to submit response' }, { status: 500 });
  }
}

// DELETE — withdraw your own response.
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const existing = await prisma.challengeResponse.findUnique({
      where: { briefId_responderId: { briefId: params.id, responderId: session.user.id } },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    await prisma.challengeResponse.delete({ where: { id: existing.id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Challenge response DELETE error:', error);
    return NextResponse.json({ error: 'Failed to withdraw response' }, { status: 500 });
  }
}
