export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAdmin, prisma } from '@/lib/admin';

const VALID_ROLES = ['PRACTITIONER', 'INNOVATOR', 'INVESTOR', 'EMPLOYER', 'POLICYMAKER', 'ADMIN', 'PATIENT'];
const VALID_TIERS = ['TIER1_BASIC', 'TIER2_PROFESSIONAL', 'TIER3_EXPERT'];

// PATCH — update a user's role, tier or hub membership.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin('admin.user.read');
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  try {
    const body = await req.json();
    const data: any = {};
    if (typeof body.role === 'string') {
      if (!VALID_ROLES.includes(body.role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      data.role = body.role;
    }
    if (typeof body.tier === 'string') {
      if (!VALID_TIERS.includes(body.tier)) return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
      data.tier = body.tier;
    }
    if (typeof body.hubMember === 'boolean') {
      data.hubMember = body.hubMember;
      data.hubJoinedAt = body.hubMember ? new Date() : null;
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data,
      select: { id: true, name: true, email: true, role: true, tier: true, hubMember: true },
    });
    return NextResponse.json({ ok: true, user });
  } catch (error: any) {
    console.error('Admin user update error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// DELETE — remove a user account. Guards against deleting the acting admin.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin('admin.user.manage');
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  try {
    if (params.id === auth.userId) {
      return NextResponse.json({ error: 'You cannot delete your own admin account.' }, { status: 400 });
    }
    await prisma.user.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Admin user delete error:', error);
    return NextResponse.json(
      { error: 'Could not delete this user — they may have linked records. Change their role instead.' },
      { status: 500 },
    );
  }
}
