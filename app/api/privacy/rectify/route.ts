export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

/** Right to rectification — DPA 2019 s.26(c). */
const EDITABLE = [
  'name',
  'phone',
  'organization',
  'headline',
  'bio',
  'linkedinUrl',
  'physicalAddress',
  'city',
  'postalCode',
  'country',
  'healthAreas',
] as const;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, any> = {};
  for (const field of EDITABLE) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      const v = body[field];
      data[field] = typeof v === 'string' && v.trim() === '' ? null : v;
    }
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nothing to correct.' }, { status: 400 });
  }
  if (typeof data.name === 'string' && data.name.trim().length < 2) {
    return NextResponse.json({ error: 'Name must be at least 2 characters.' }, { status: 400 });
  }

  const updated = await prisma.user.update({ where: { id: userId }, data });

  await logAudit({
    userId,
    actorEmail: updated.email,
    action: 'DATA_RECTIFICATION',
    entityType: 'User',
    entityId: userId,
    request: req,
    context: { fields: Object.keys(data) },
  });

  return NextResponse.json({ ok: true, fields: Object.keys(data) });
}
