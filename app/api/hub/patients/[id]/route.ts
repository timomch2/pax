export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireHubPractitioner, prisma } from '@/lib/hub';
import { logAudit } from '@/lib/audit';

async function ownPatient(userId: string, id: string) {
  const p = await prisma.hubPatient.findUnique({ where: { id } });
  if (!p || p.practitionerId !== userId) return null;
  return p;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireHubPractitioner('hub.patient.read');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const patient = await prisma.hubPatient.findFirst({
    where: { id: params.id, practitionerId: auth.userId },
    include: {
      invoices: {
        orderBy: { serviceDate: 'desc' },
        include: { payers: true },
      },
    },
  });
  if (!patient) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await logAudit({ userId: auth.userId, action: 'PATIENT_VIEW', entityType: 'HubPatient', entityId: params.id, request: req });
  return NextResponse.json({ patient });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireHubPractitioner('hub.patient.update');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!(await ownPatient(auth.userId, params.id)))
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const patient = await prisma.hubPatient.update({
    where: { id: params.id },
    data: {
      ...(body.name !== undefined ? { name: String(body.name).trim() } : {}),
      ...(body.phone !== undefined ? { phone: body.phone?.trim() || null } : {}),
      ...(body.email !== undefined ? { email: body.email?.trim() || null } : {}),
      ...(body.nationalId !== undefined ? { nationalId: body.nationalId?.trim() || null } : {}),
      ...(body.patientRef !== undefined ? { patientRef: body.patientRef?.trim() || null } : {}),
      ...(body.notes !== undefined ? { notes: body.notes?.trim() || null } : {}),
    },
  });
  await logAudit({ userId: auth.userId, action: 'PATIENT_UPDATE', entityType: 'HubPatient', entityId: params.id, request: req });
  return NextResponse.json({ patient });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireHubPractitioner('hub.patient.delete');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!(await ownPatient(auth.userId, params.id)))
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const invoiceCount = await prisma.invoice.count({ where: { hubPatientId: params.id } });
  if (invoiceCount > 0) {
    return NextResponse.json(
      { error: 'This patient has invoices. Archive those first, or keep the record for your books.' },
      { status: 400 },
    );
  }
  await prisma.hubPatient.delete({ where: { id: params.id } });
  await logAudit({ userId: auth.userId, action: 'PATIENT_DELETE', entityType: 'HubPatient', entityId: params.id, request: req });
  return NextResponse.json({ ok: true });
}
