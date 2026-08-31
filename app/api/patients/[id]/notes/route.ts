export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/authorization';
import { z } from 'zod';

const noteSchema = z.object({ content: z.string().trim().min(1).max(10_000) }).strict();

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requirePermission('hub.note.create', { resourceId: params.id, entityType: 'PatientNote' }, req);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const parsed = noteSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid note' }, { status: 400 });

    if (auth.scope !== 'ALL') {
      const relationship = await prisma.clinicalRelationship.findFirst({
        where: { practitionerId: auth.userId, patientId: params.id, status: 'ACTIVE' },
        select: { id: true },
      });
      if (!relationship) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const note = await prisma.patientNote.create({
      data: {
        patientId: params.id,
        authorId: auth.userId,
        content: parsed.data.content,
      },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error: any) {
    console.error('Patient note create error:', error);
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
  }
}
