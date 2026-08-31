import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, prisma } from '@/lib/admin';

export const dynamic = 'force-dynamic';

// PATCH /api/debates/contributions/[cid]/moderate — ADMIN ONLY.
// This is the human-approves-removal gate. AI can only FLAG; only a human here
// can set OK (approve/restore) or REMOVED (hide).
export async function PATCH(req: NextRequest, { params }: { params: { cid: string } }) {
  try {
    const admin = await requireAdmin('debate.moderate');
    if (!admin.ok) return NextResponse.json({ error: 'Forbidden' }, { status: admin.status });

    const b = await req.json();
    const action = String(b.action ?? '');
    let status: 'OK' | 'REMOVED';
    if (action === 'approve') status = 'OK';
    else if (action === 'remove') status = 'REMOVED';
    else return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });

    await prisma.debateContribution.update({
      where: { id: params.cid },
      data: {
        moderationStatus: status,
        moderationReviewedById: admin.userId,
        moderationReviewedAt: new Date(),
        ...(action === 'approve' ? { moderationReason: null } : {}),
      },
    });

    return NextResponse.json({ ok: true, status });
  } catch (error: any) {
    console.error('Moderate PATCH error:', error);
    return NextResponse.json({ error: 'Failed to moderate' }, { status: 500 });
  }
}
