export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireHubPractitioner, prisma } from '@/lib/hub';

async function ownInvoice(userId: string, id: string) {
  const inv = await prisma.invoice.findUnique({ where: { id } });
  if (!inv || inv.practitionerId !== userId) return null;
  return inv;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireHubPractitioner('hub.invoice.read');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const invoice = await prisma.invoice.findFirst({
    where: { id: params.id, practitionerId: auth.userId },
    include: {
      hubPatient: true,
      payers: {
        orderBy: { createdAt: 'asc' },
        include: {
          insurer: { select: { id: true, name: true, shortName: true } },
          reminders: { orderBy: { createdAt: 'desc' } },
        },
      },
    },
  });
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const practitioner = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { name: true, phone: true, email: true, organization: true, paxId: true },
  });
  return NextResponse.json({ invoice, practitioner });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireHubPractitioner('hub.invoice.update');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!(await ownInvoice(auth.userId, params.id)))
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const invoice = await prisma.invoice.update({
    where: { id: params.id },
    data: {
      ...(body.serviceDesc !== undefined ? { serviceDesc: String(body.serviceDesc).trim() } : {}),
      ...(body.serviceType !== undefined ? { serviceType: body.serviceType?.trim() || null } : {}),
      ...(body.serviceDate !== undefined ? { serviceDate: new Date(body.serviceDate) } : {}),
      ...(body.notes !== undefined ? { notes: body.notes?.trim() || null } : {}),
    },
  });
  return NextResponse.json({ invoice });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireHubPractitioner('hub.invoice.delete');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!(await ownInvoice(auth.userId, params.id)))
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await prisma.invoice.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
