export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireHubPractitioner, prisma, generatePatientCode } from '@/lib/hub';
import { logAudit } from '@/lib/audit';

// GET — list this practitioner's patient records (with optional search).
// Search matches the system patient ID, name, phone, the practitioner's own
// file reference, national ID and email, so a returning patient can be found
// with whatever detail they arrive with.
export async function GET(req: NextRequest) {
  const auth = await requireHubPractitioner('hub.patient.read');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim();
  const sort = url.searchParams.get('sort') === 'name' ? 'name' : 'recent';

  // Any legacy record created before system IDs existed gets one now, so the
  // list never shows a patient without an ID.
  const missing = await prisma.hubPatient.findMany({
    where: { practitionerId: auth.userId, patientCode: null },
    select: { id: true },
  });
  for (const m of missing) {
    await prisma.hubPatient.update({ where: { id: m.id }, data: { patientCode: await generatePatientCode() } });
  }

  const rows = await prisma.hubPatient.findMany({
    where: {
      practitionerId: auth.userId,
      ...(q
        ? {
            OR: [
              { patientCode: { contains: q, mode: 'insensitive' } },
              { name: { contains: q, mode: 'insensitive' } },
              { phone: { contains: q, mode: 'insensitive' } },
              { patientRef: { contains: q, mode: 'insensitive' } },
              { nationalId: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { invoices: true } },
      invoices: {
        orderBy: { serviceDate: 'desc' },
        select: { serviceDate: true, totalAmount: true, status: true, serviceType: true, serviceDesc: true },
      },
    },
  });

  const patients = rows.map((p) => {
    const invoices = p.invoices ?? [];
    const lastVisit = invoices[0]?.serviceDate ?? null;
    const totalBilled = invoices.reduce((s, i) => s + (i.totalAmount ?? 0), 0);
    const outstanding = invoices
      .filter((i) => i.status !== 'PAID')
      .reduce((s, i) => s + (i.totalAmount ?? 0), 0);
    const { invoices: _drop, ...rest } = p;
    return {
      ...rest,
      lastVisit,
      lastService: invoices[0]?.serviceType || invoices[0]?.serviceDesc || null,
      visitCount: invoices.length,
      totalBilled,
      outstanding,
      isReturning: invoices.length > 1,
    };
  });

  if (sort === 'recent') {
    patients.sort((a, b) => {
      const ta = a.lastVisit ? new Date(a.lastVisit).getTime() : 0;
      const tb = b.lastVisit ? new Date(b.lastVisit).getTime() : 0;
      if (tb !== ta) return tb - ta;
      return a.name.localeCompare(b.name);
    });
  }

  await logAudit({ userId: auth.userId, action: 'PATIENT_VIEW', entityType: 'HubPatient', request: req, context: { count: patients.length } });
  return NextResponse.json({ patients });
}

// POST — create a patient record. The system ID is assigned here and never changes.
export async function POST(req: NextRequest) {
  const auth = await requireHubPractitioner('hub.patient.create');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = await req.json().catch(() => ({}));
  const name = (body.name ?? '').trim();
  if (!name) return NextResponse.json({ error: 'Patient name is required.' }, { status: 400 });
  const patient = await prisma.hubPatient.create({
    data: {
      practitionerId: auth.userId,
      name,
      patientCode: await generatePatientCode(),
      phone: body.phone?.trim() || null,
      email: body.email?.trim() || null,
      nationalId: body.nationalId?.trim() || null,
      patientRef: body.patientRef?.trim() || null,
      notes: body.notes?.trim() || null,
    },
  });
  await logAudit({ userId: auth.userId, action: 'PATIENT_CREATE', entityType: 'HubPatient', entityId: patient.id, request: req });
  return NextResponse.json({ patient });
}
