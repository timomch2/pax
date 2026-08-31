export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { enqueueInAppNotification } from '@/lib/notification-service';

// POST — the owner of a GPS entry requests endorsements from selected members.
// Each recipient gets an in-app notification linking to the requester's public
// profile, where they can review the work and add their endorsement.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const entry = await prisma.gpsEntry.findUnique({ where: { id: params.id } });
    if (!entry) {
      return NextResponse.json({ error: 'GPS entry not found' }, { status: 404 });
    }
    if (entry.userId !== session.user.id) {
      return NextResponse.json({ error: 'You can only request endorsements for your own work.' }, { status: 403 });
    }

    const body = await req.json();
    const memberIds: string[] = Array.isArray(body?.memberIds) ? body.memberIds : [];
    // Never notify yourself, and de-duplicate.
    const recipients = Array.from(new Set(memberIds.filter((id) => id && id !== session.user.id)));
    if (recipients.length === 0) {
      return NextResponse.json({ error: 'Please choose at least one person to ask.' }, { status: 400 });
    }

    const requester = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true },
    });
    const requesterName = requester?.name?.trim() || 'A member';

    // Skip people who have already endorsed this entry.
    const already = await prisma.gpsEndorsement.findMany({
      where: { gpsEntryId: params.id, endorserId: { in: recipients } },
      select: { endorserId: true },
    });
    const alreadySet = new Set(already.map((a) => a.endorserId));
    const toNotify = recipients.filter((id) => !alreadySet.has(id));

    if (toNotify.length === 0) {
      return NextResponse.json({ error: 'Everyone you selected has already endorsed this entry.' }, { status: 400 });
    }

    await Promise.all(toNotify.map((userId) => enqueueInAppNotification(prisma, {
      userId,
      templateSlug: 'gps.endorsement-request',
      variables: { requesterName, entryTitle: entry.title, requesterId: session.user.id },
      idempotencyKey: `gps-endorsement:${entry.id}:${userId}`,
    })));

    return NextResponse.json({ requested: toNotify.length, skipped: recipients.length - toNotify.length });
  } catch (error: any) {
    console.error('Request endorsement POST error:', error);
    return NextResponse.json({ error: 'Failed to send endorsement requests' }, { status: 500 });
  }
}
