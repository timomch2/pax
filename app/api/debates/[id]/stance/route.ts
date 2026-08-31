import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { STANCE_ORDER } from '@/lib/debate';

export const dynamic = 'force-dynamic';

// POST /api/debates/[id]/stance — upsert a quick reaction (one per member)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const b = await req.json();
    const reaction = String(b.reaction ?? '');
    if (!(STANCE_ORDER as string[]).includes(reaction)) {
      return NextResponse.json({ error: 'Invalid reaction.' }, { status: 400 });
    }

    const debate = await prisma.debate.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!debate) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.debateStance.upsert({
      where: { debateId_userId: { debateId: params.id, userId: session.user.id } },
      create: { debateId: params.id, userId: session.user.id, reaction: reaction as any },
      update: { reaction: reaction as any },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Stance POST error:', error);
    return NextResponse.json({ error: 'Failed to record reaction' }, { status: 500 });
  }
}
