export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { expandedPracticePath, practiceWorkspaceForOwner } from '@/lib/practice-legacy';
import { practiceTransaction, lockPractice } from '@/lib/practice-db';
import { assertCalendarAvailable } from '@/lib/practice-calendar-service';
import { PracticeError } from '@/lib/practice-policy';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/authorization';
import { z } from 'zod';

const updateAppointmentSchema = z.object({
  status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED']).optional(),
  fee: z.coerce.number().int().min(0).max(100_000_000).optional(),
  location: z.string().trim().max(300).nullable().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
  type: z.enum(['CONSULTATION', 'REVIEW', 'WARD_ROUND', 'THEATRE']).optional(),
  dateTime: z.string().datetime({ offset: true }).optional(),
}).strict();

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const existing = await prisma.appointment.findUnique({
      where: { id: params.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }
    const auth = await requirePermission(
      'hub.appointment.update',
      { ownerId: existing.practitionerId, resourceId: existing.id, entityType: 'Appointment' },
      req,
    );
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    if (await expandedPracticePath(existing.practitionerId) || await prisma.practiceEvent.findUnique({ where: { legacyAppointmentId: existing.id } })) return NextResponse.json({ error: 'Use the practice workspace calendar for this appointment.' }, { status: 409 });

    const parsed = updateAppointmentSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid appointment data', details: parsed.error.flatten() }, { status: 400 });
    const { status, fee, location, notes, type, dateTime } = parsed.data;

    const updateData: any = {};
    if (status) updateData.status = status;
    if (fee !== undefined) updateData.fee = fee;
    if (location !== undefined) updateData.location = location;
    if (notes !== undefined) updateData.notes = notes;
    if (type) updateData.type = type;
    if (dateTime) updateData.dateTime = new Date(dateTime);

    const workspace = await practiceWorkspaceForOwner(existing.practitionerId);
    const updated = await practiceTransaction(async (tx) => {
      if (workspace) {
        await lockPractice(tx, workspace.id);
        if ((status ?? existing.status) === 'SCHEDULED' && (dateTime || status)) {
          const startsAt = new Date(dateTime ?? existing.dateTime);
          await assertCalendarAvailable(tx, workspace.id, existing.practitionerId, [{ startsAt, endsAt: new Date(startsAt.getTime() + 1800000) }], [], null, false, [existing.id]);
        }
      }
      const updated = await tx.appointment.update({
      where: { id: params.id },
      data: updateData,
      include: {
        patient: { select: { id: true, name: true } },
      },
    });

    // If completed, create/update billing record
    if (status === 'COMPLETED') {
      await tx.billingRecord.upsert({
        where: { appointmentId: params.id },
        create: {
          appointmentId: params.id,
          amount: updated.fee,
          paymentStatus: 'PENDING',
        },
        update: {
          amount: updated.fee,
        },
      });
    }

      return updated;
    });
    return NextResponse.json(updated);
  } catch (error: any) {
    if (error instanceof PracticeError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Appointment update error:', error);
    return NextResponse.json({ error: 'Failed to update appointment' }, { status: 500 });
  }
}
