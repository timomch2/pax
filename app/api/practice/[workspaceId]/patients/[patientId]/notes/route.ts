import { z } from 'zod';
import { requirePractice, authorizePracticeUser } from '@/lib/authorization';
import { practiceResponse } from '@/lib/practice-http';
import { readPracticeNotes } from '@/lib/practice-patients';
import { practiceTransaction } from '@/lib/practice-db';
import { assertPractice } from '@/lib/practice-policy';
export const dynamic = 'force-dynamic';
type Context = { params: { workspaceId: string; patientId: string } };
export async function GET(_request: Request, { params }: Context) {
  return practiceResponse(async () => { const auth = await requirePractice(params.workspaceId, 'clinical.read'); return readPracticeNotes(auth.actorId, auth.workspaceId, params.patientId); });
}
export async function POST(request: Request, { params }: Context) {
  return practiceResponse(async () => {
    const auth = await requirePractice(params.workspaceId, 'clinical.manage');
    const body = z.object({ body: z.string().trim().min(1).max(20000) }).strict().parse(await request.json());
    return practiceTransaction(async (tx) => {
      await authorizePracticeUser(auth.actorId, auth.workspaceId, 'clinical.manage', tx);
      assertPractice(await tx.hubPatient.findFirst({ where: { id: params.patientId, practitionerId: auth.ownerId }, select: { id: true } }), 404, 'Patient not found');
      const note = await tx.practicePatientNote.create({ data: { patientId: params.patientId, authorId: auth.actorId, body: body.body } });
      await tx.practiceAuditEvent.create({ data: { workspaceId: auth.workspaceId, actorId: auth.actorId, action: 'CLINICAL_NOTE_ADDED', entityId: params.patientId } });
      return { note };
    });
  }, 201);
}
