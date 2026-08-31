export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireHubPractitioner, prisma } from '@/lib/hub';
import { INSURER_CATEGORIES } from '@/lib/hub-finance';

// GET — list system-default payer entities + this practitioner's own additions.
export async function GET() {
  const auth = await requireHubPractitioner('hub.insurer.manage');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const insurers = await prisma.insurer.findMany({
    where: { OR: [{ isSystem: true }, { createdById: auth.userId }] },
    orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
  });
  return NextResponse.json({ insurers });
}

// POST — add a custom payer entity to the directory.
export async function POST(req: NextRequest) {
  const auth = await requireHubPractitioner('hub.insurer.manage');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = await req.json().catch(() => ({}));
  const name = (body.name ?? '').trim();
  if (!name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
  const category = INSURER_CATEGORIES.includes(body.category) ? body.category : 'PRIVATE';
  const insurer = await prisma.insurer.create({
    data: {
      name,
      shortName: body.shortName?.trim() || null,
      category,
      contactPhone: body.contactPhone?.trim() || null,
      contactEmail: body.contactEmail?.trim() || null,
      isSystem: false,
      createdById: auth.userId,
    },
  });
  return NextResponse.json({ insurer });
}
