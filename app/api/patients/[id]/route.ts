export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/authorization';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requirePermission('hub.patient.read', { resourceId: params.id, entityType: 'User' }, req);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    if (auth.scope !== 'ALL') {
      const relationship = await prisma.clinicalRelationship.findFirst({
        where: { practitionerId: auth.userId, patientId: params.id, status: 'ACTIVE' },
        select: { id: true },
      });
      if (!relationship) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const patient = await prisma.user.findFirst({
      where: { id: params.id, role: 'PATIENT' },
      select: { id: true, name: true, email: true, phone: true, createdAt: true },
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const appointments = await prisma.appointment.findMany({
      where: { patientId: params.id, ...(auth.scope === 'ALL' ? {} : { practitionerId: auth.userId }) },
      orderBy: { dateTime: 'desc' },
      include: { billingRecord: true },
    });

    const notes = await prisma.patientNote.findMany({
      where: { patientId: params.id, ...(auth.scope === 'ALL' ? {} : { authorId: auth.userId }) },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ patient, appointments: appointments ?? [], notes: notes ?? [] });
  } catch (error: any) {
    console.error('Patient detail error:', error);
    return NextResponse.json({ error: 'Failed to load patient details' }, { status: 500 });
  }
}
