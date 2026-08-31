export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/db';

// PATCH — Assign or remove a devil's advocate (admin only)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin('debate.moderate');
  if (!admin.ok) return NextResponse.json({ error: 'Forbidden' }, { status: admin.status });

  const body = await req.json();
  const devilsAdvocateId = body.userId || null;

  // Validate user exists if setting
  if (devilsAdvocateId) {
    const user = await prisma.user.findUnique({ where: { id: devilsAdvocateId } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const updated = await prisma.debate.update({
    where: { id: params.id },
    data: { devilsAdvocateId },
    include: { devilsAdvocate: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ devilsAdvocateId: updated.devilsAdvocateId, devilsAdvocateName: updated.devilsAdvocate?.name });
}

// GET — Search members for assignment
export async function GET(req: NextRequest) {
  const admin = await requireAdmin('debate.moderate');
  if (!admin.ok) return NextResponse.json({ error: 'Forbidden' }, { status: admin.status });

  const q = req.nextUrl.searchParams.get('q') || '';
  if (q.length < 2) return NextResponse.json({ users: [] });

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, email: true, role: true, tier: true },
    take: 10,
  });
  return NextResponse.json({ users });
}
