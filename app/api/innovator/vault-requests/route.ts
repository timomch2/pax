export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET — innovator's vault access requests across all their innovations.
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const requests = await prisma.vaultAccessRequest.findMany({
      where: { innovation: { ownerId: session.user.id } },
      orderBy: { createdAt: 'desc' },
      include: {
        requester: { select: { id: true, name: true, email: true, organization: true } },
        innovation: { select: { id: true, title: true } },
      },
    });
    return NextResponse.json({ requests });
  } catch (error: any) {
    console.error('Vault requests GET error:', error);
    return NextResponse.json({ error: 'Failed to load vault requests' }, { status: 500 });
  }
}
