export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/authorization';

// Returns all patient users for appointment creation dropdown
export async function GET() {
  try {
    const auth = await requirePermission('hub.patient.read');
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const patients = await prisma.user.findMany({
      where: {
        role: 'PATIENT',
        ...(auth.scope === 'ALL'
          ? {}
          : {
              clinicalRelationshipsAsPatient: {
                some: { practitionerId: auth.userId, status: 'ACTIVE' },
              },
            }),
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(patients ?? []);
  } catch (error: any) {
    console.error('Patient list error:', error);
    return NextResponse.json({ error: 'Failed to load patients' }, { status: 500 });
  }
}
