export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { expandedPracticePath, practiceWorkspaceForOwner } from '@/lib/practice-legacy';
import { practiceTransaction, lockPractice } from '@/lib/practice-db';
import { assertCalendarAvailable } from '@/lib/practice-calendar-service';
import { PracticeError } from '@/lib/practice-policy';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/authorization';
import { z } from 'zod';

const createAppointmentSchema = z.object({
  patientId: z.string().cuid(),
  practitionerId: z.string().cuid().optional(),
  dateTime: z.string().datetime({ offset: true }),
  type: z.enum(['CONSULTATION', 'REVIEW', 'WARD_ROUND', 'THEATRE']).default('CONSULTATION'),
  status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED']).default('SCHEDULED'),
  location: z.string().trim().max(300).optional().nullable(),
  fee: z.coerce.number().int().min(0).max(100_000_000).default(0),
  notes: z.string().trim().max(5000).optional().nullable(),
}).strict();

export async function GET(req: NextRequest) {
  try {
    const auth = await requirePermission('hub.appointment.read', {}, req);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    const whereClause: any = auth.scope === 'ALL' ? {} : {
      OR: [{ practitionerId: auth.userId }, { patientId: auth.userId }],
    };

    if (status && status !== 'ALL') {
      whereClause.status = status;
    }
    if (from) {
      whereClause.dateTime = { ...(whereClause.dateTime ?? {}), gte: new Date(from) };
    }
    if (to) {
      whereClause.dateTime = { ...(whereClause.dateTime ?? {}), lte: new Date(to) };
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      orderBy: { dateTime: 'desc' },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        practitioner: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(appointments ?? []);
  } catch (error: any) {
    console.error('Appointments GET error:', error);
    return NextResponse.json({ error: 'Failed to load appointments' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requirePermission('hub.appointment.create', {}, req);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const parsed = createAppointmentSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid appointment data', details: parsed.error.flatten() }, { status: 400 });
    }
    const { patientId, dateTime, type, location, fee, notes, status } = parsed.data;
    const practitionerId = auth.scope === 'ALL' && parsed.data.practitionerId
      ? parsed.data.practitionerId
      : auth.userId;

    const [patient, relationship] = await Promise.all([
      prisma.user.findFirst({ where: { id: patientId, role: 'PATIENT', accountStatus: 'ACTIVE' }, select: { id: true } }),
      auth.scope === 'ALL'
        ? Promise.resolve({ id: 'administrative-scope' })
        : prisma.clinicalRelationship.findFirst({
            where: { practitionerId: auth.userId, patientId, status: 'ACTIVE' },
            select: { id: true },
          }),
    ]);
    if (!patient || !relationship) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });

    if (await expandedPracticePath(practitionerId)) return NextResponse.json({ error: 'Use the practice workspace calendar to book appointments.' }, { status: 409 });
    const workspace = await practiceWorkspaceForOwner(practitionerId);
    const appointment = await practiceTransaction(async (tx) => {
      if (workspace) { await lockPractice(tx, workspace.id); await assertCalendarAvailable(tx, workspace.id, practitionerId, [{ startsAt: new Date(dateTime), endsAt: new Date(Date.parse(dateTime) + 1800000) }], [], null, false); }
      return tx.appointment.create({
      data: {
        practitionerId,
        patientId,
        dateTime: new Date(dateTime),
        type,
        status,
        location: location || null,
        fee,
        notes: notes || null,
      },
      include: {
        patient: { select: { id: true, name: true } },
      },
    });

    });
    return NextResponse.json(appointment, { status: 201 });
  } catch (error: any) {
    if (error instanceof PracticeError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Appointment create error:', error);
    return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 });
  }
}
