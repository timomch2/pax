export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const updateSchema = z.object({ ids: z.array(z.string().cuid()).max(100).optional(), all: z.boolean().optional() }).strict();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const notifications = await prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return NextResponse.json({ notifications });
  } catch (error: any) {
    console.error('Notifications GET error:', error);
    return NextResponse.json({ error: 'Failed to load notifications' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const parsed = updateSchema.safeParse(await request.json().catch(() => ({ all: true })));
    if (!parsed.success || (!parsed.data.all && !parsed.data.ids?.length)) return NextResponse.json({ error: 'Invalid notification update' }, { status: 400 });
    await prisma.notification.updateMany({
      where: { userId: session.user.id, read: false, ...(parsed.data.all ? {} : { id: { in: parsed.data.ids } }) },
      data: { read: true },
    });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Notifications PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
  }
}
