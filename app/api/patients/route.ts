export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/authorization';

export async function GET() {
  try {
    const auth = await requirePermission('hub.patient.read');
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    // Get unique patients who have appointments with this practitioner
    const appointments = await prisma.appointment.findMany({
      where: {
        ...(auth.scope === 'ALL' ? {} : { practitionerId: auth.userId }),
        patient: auth.scope === 'ALL' ? undefined : {
          clinicalRelationshipsAsPatient: {
            some: { practitionerId: auth.userId, status: 'ACTIVE' },
          },
        },
      },
      select: {
        patientId: true,
        dateTime: true,
        patient: {
          select: { id: true, name: true, phone: true, email: true },
        },
      },
      orderBy: { dateTime: 'desc' },
    });

    // Group by patient
    const patientMap = new Map<string, any>();
    for (const apt of appointments ?? []) {
      const pid = apt?.patientId;
      if (!pid) continue;
      if (!patientMap.has(pid)) {
        patientMap.set(pid, {
          ...apt.patient,
          lastVisit: apt.dateTime,
          totalVisits: 1,
        });
      } else {
        const existing = patientMap.get(pid);
        existing.totalVisits = (existing?.totalVisits ?? 0) + 1;
      }
    }

    return NextResponse.json(Array.from(patientMap.values()));
  } catch (error: any) {
    console.error('Patients GET error:', error);
    return NextResponse.json({ error: 'Failed to load patients' }, { status: 500 });
  }
}
