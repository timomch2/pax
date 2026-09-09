import { z } from 'zod';
import { requirePractice, authorizePracticeUser } from '@/lib/authorization';
import { prisma } from '@/lib/db';
import { practiceResponse } from '@/lib/practice-http';
import { assertPractice } from '@/lib/practice-policy';
import { practiceTransaction, lockPractice } from '@/lib/practice-db';
import { facilityDto } from '@/lib/facility-service';
export const dynamic = 'force-dynamic';
type Context = { params: { workspaceId: string } };
const input = z.object({ id: z.string().cuid().optional(), facilityId: z.string().cuid(), startsAt: z.string().datetime({ offset: true }), endsAt: z.string().datetime({ offset: true }).nullable().default(null), rateType: z.enum(['SERVICE', 'HOUR', 'SESSION', 'MONTHLY']).default('SERVICE'), rateMinor: z.number().int().nonnegative().max(2000000000).default(0), coveredServices: z.array(z.string().trim().min(1).max(160)).max(100).default([]) }).strict().refine((v) => !v.endsAt || new Date(v.endsAt) >= new Date(v.startsAt), 'End must follow start');

export async function GET(_request: Request, { params }: Context) {
  return practiceResponse(async () => {
    const auth = await requirePractice(params.workspaceId, 'facility.read');
    const rows = await prisma.consultingFacility.findMany({ where: { workspaceId: auth.workspaceId }, include: { facility: true }, orderBy: { startsAt: 'desc' } });
    return { relationships: rows.map((row) => ({ id: row.id, facilityId: row.facilityId, startsAt: row.startsAt, endsAt: row.endsAt, facility: facilityDto(row.facility), ...(auth.capabilities.includes('billing.read') ? { rateType: row.rateType, rateMinor: row.rateMinor, coveredServices: row.coveredServices } : {}) })) };
  });
}
export async function POST(request: Request, { params }: Context) {
  return practiceResponse(async () => {
    const auth = await requirePractice(params.workspaceId, 'facility.manage');
    const body = input.parse(await request.json());
    return practiceTransaction(async (tx) => {
      await lockPractice(tx, auth.workspaceId);
      await authorizePracticeUser(auth.actorId, auth.workspaceId, 'facility.manage', tx);
      assertPractice(await tx.healthFacility.findUnique({ where: { id: body.facilityId }, select: { id: true } }), 404, 'Facility not found');
      const { id, ...fields } = body;
      if (id) assertPractice(await tx.consultingFacility.findFirst({ where: { id, workspaceId: auth.workspaceId } }), 404, 'Consulting relationship not found');
      const overlap = await tx.consultingFacility.findFirst({ where: { workspaceId: auth.workspaceId, facilityId: body.facilityId, ...(id ? { id: { not: id } } : {}), startsAt: { lte: new Date(body.endsAt ?? '9999-12-31') }, OR: [{ endsAt: null }, { endsAt: { gte: new Date(body.startsAt) } }] } });
      assertPractice(!overlap, 409, 'This facility already has a consulting relationship covering these dates');
      const row = id ? await tx.consultingFacility.update({ where: { id }, data: fields }) : await tx.consultingFacility.create({ data: { ...fields, workspaceId: auth.workspaceId } });
      await tx.practiceAuditEvent.create({ data: { workspaceId: auth.workspaceId, actorId: auth.actorId, action: 'CONSULTING_RELATIONSHIP_SAVED', entityId: row.id } });
      return { relationship: row };
    });
  });
}
