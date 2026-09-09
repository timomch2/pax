import { randomBytes } from 'crypto';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authorizePracticeUser } from '@/lib/authorization';
import { assertPractice } from '@/lib/practice-policy';
import { lockPractice, practiceTransaction } from '@/lib/practice-db';

export const practicePatientSchema = z.object({
  id: z.string().cuid().optional(), name: z.string().trim().min(2).max(160),
  phone: z.string().trim().max(40).nullable().default(null), email: z.string().trim().email().max(320).transform((v) => v.toLowerCase()).nullable().default(null),
  patientRef: z.string().trim().max(100).nullable().default(null), nationalId: z.string().trim().max(100).nullable().default(null),
  remindersEnabled: z.boolean().default(true),
  duplicateReason: z.string().trim().min(5).max(1000).optional(),
}).strict();

export async function listPracticePatients(actorId: string, workspaceId: string, q: string, cursor?: string) {
  const auth = await authorizePracticeUser(actorId, workspaceId, 'patient.read');
  const financeOnly = !auth.capabilities.includes('calendar.read');
  const rows = await prisma.hubPatient.findMany({ where: { practitionerId: auth.ownerId, ...(q ? { OR: [
    { name: { contains: q, mode: 'insensitive' as const } }, { patientCode: { contains: q, mode: 'insensitive' as const } },
    { patientRef: { contains: q, mode: 'insensitive' as const } }, { email: { contains: q, mode: 'insensitive' as const } }, { phone: { contains: q } },
  ] } : {}) }, select: { id: true, name: true, patientCode: true, patientRef: true, phone: true, email: true, remindersEnabled: true, ...(!financeOnly ? { nationalId: true } : {}) }, orderBy: { id: 'asc' }, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}), take: 51 });
  return { patients: rows.slice(0, 50), nextCursor: rows.length > 50 ? rows[49].id : null };
}

export async function savePracticePatient(actorId: string, workspaceId: string, raw: unknown) {
  const body = practicePatientSchema.parse(raw);
  return practiceTransaction(async (tx) => {
    await lockPractice(tx, workspaceId);
    const auth = await authorizePracticeUser(actorId, workspaceId, 'patient.manage', tx);
    if (body.id) assertPractice(await tx.hubPatient.findFirst({ where: { id: body.id, practitionerId: auth.ownerId }, select: { id: true } }), 404, 'Patient not found');
    const matches = await tx.hubPatient.findMany({ where: { practitionerId: auth.ownerId, ...(body.id ? { id: { not: body.id } } : {}), OR: [
      { name: { equals: body.name, mode: 'insensitive' as const } }, ...(body.email ? [{ email: body.email }] : []), ...(body.phone ? [{ phone: body.phone }] : []), ...(body.nationalId ? [{ nationalId: body.nationalId }] : []),
    ] }, select: { id: true, name: true, patientCode: true, patientRef: true }, take: 20 });
    if (matches.length && !body.duplicateReason) return { requiresReview: true, matches };
    const { id, duplicateReason, ...fields } = body;
    const patient = id ? await tx.hubPatient.update({ where: { id }, data: fields }) : await tx.hubPatient.create({ data: { ...fields, practitionerId: auth.ownerId, patientCode: `PAX-P-${randomBytes(6).toString('hex').toUpperCase()}` } });
    await tx.practiceAuditEvent.create({ data: { workspaceId, actorId, action: id ? 'PATIENT_UPDATED' : 'PATIENT_CREATED', entityId: patient.id, context: { duplicateReason: duplicateReason ?? null } } });
    return { patient: { id: patient.id, name: patient.name, patientCode: patient.patientCode } };
  });
}

export async function readPracticeNotes(actorId: string, workspaceId: string, patientId: string) {
  const auth = await authorizePracticeUser(actorId, workspaceId, 'clinical.read');
  const patient = await prisma.hubPatient.findFirst({ where: { id: patientId, practitionerId: auth.ownerId }, select: { id: true, notes: true, legacyUserId: true } });
  assertPractice(patient, 404, 'Patient not found');
  const notes = await prisma.practicePatientNote.findMany({ where: { patientId }, orderBy: { createdAt: 'desc' }, take: 100 });
  const legacy = patient.legacyUserId ? await prisma.patientNote.findMany({ where: { patientId: patient.legacyUserId, authorId: auth.ownerId }, select: { id: true, content: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 100 }) : [];
  await prisma.practiceAuditEvent.create({ data: { workspaceId, actorId, action: 'CLINICAL_NOTES_READ', entityId: patientId } });
  return { notes, legacyNotes: legacy, originalNote: patient.notes };
}
