export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { VAULT_NDA_SLUG } from '@/lib/vault-nda';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const template = await prisma.ndaTemplate.findFirst({
    where: { slug: VAULT_NDA_SLUG, active: true, effectiveAt: { lte: new Date() } },
    orderBy: { version: 'desc' },
    select: { title: true, body: true, version: true, contentHash: true, effectiveAt: true },
  });
  if (!template) return NextResponse.json({ error: 'No active NDA template' }, { status: 503 });
  return NextResponse.json({ template });
}
