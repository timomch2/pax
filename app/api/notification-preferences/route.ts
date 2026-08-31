export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

const preferenceSchema = z.object({
  emailEnabled: z.boolean().optional(), smsEnabled: z.boolean().optional(), whatsappEnabled: z.boolean().optional(),
  marketingEmail: z.boolean().optional(), marketingSms: z.boolean().optional(),
}).strict();

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const preferences = await prisma.notificationPreference.upsert({ where: { userId: session.user.id }, update: {}, create: { userId: session.user.id } });
  return NextResponse.json({ preferences });
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = preferenceSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid preferences' }, { status: 400 });
  const preferences = await prisma.notificationPreference.upsert({ where: { userId: session.user.id }, update: parsed.data, create: { userId: session.user.id, ...parsed.data } });
  return NextResponse.json({ preferences });
}
