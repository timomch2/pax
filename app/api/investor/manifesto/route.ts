export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// POST — record manifesto acceptance
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const mandate = await prisma.investorMandate.findUnique({ where: { userId: session.user.id } });
    if (!mandate) {
      // Create a minimal mandate record with manifesto accepted
      await prisma.investorMandate.create({
        data: {
          userId: session.user.id,
          ethicalManifestoAcceptedAt: new Date(),
        },
      });
    } else {
      await prisma.investorMandate.update({
        where: { userId: session.user.id },
        data: { ethicalManifestoAcceptedAt: new Date() },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Manifesto accept error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// GET — check if manifesto is accepted
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const mandate = await prisma.investorMandate.findUnique({ where: { userId: session.user.id } });
    return NextResponse.json({
      accepted: !!mandate?.ethicalManifestoAcceptedAt,
      acceptedAt: mandate?.ethicalManifestoAcceptedAt || null,
    });
  } catch (err: unknown) {
    console.error('Manifesto check error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
