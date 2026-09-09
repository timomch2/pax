import { z } from 'zod';
import { requirePermission } from '@/lib/authorization';
import { prisma } from '@/lib/db';
import { practiceResponse } from '@/lib/practice-http';
import { assertPractice } from '@/lib/practice-policy';
import { reviewFacilityCorrection } from '@/lib/facility-service';
import { importFacilityPage } from '@/lib/facility-import';
export const dynamic = 'force-dynamic';

async function admin(request: Request) {
  const auth = await requirePermission('admin.system.manage', {}, request);
  assertPractice(auth.ok, auth.ok ? 403 : auth.status, auth.ok ? 'Forbidden' : auth.error);
  assertPractice(process.env.PRACTICE_WORKSPACE_ENABLED === 'true', 404, 'Practice workspace is not enabled');
  return auth;
}
export async function GET(request: Request) {
  return practiceResponse(async () => {
    await admin(request);
    const [runs, corrections] = await Promise.all([
      prisma.facilityImportRun.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
      prisma.facilityCorrection.findMany({ where: { status: 'PENDING' }, include: { facility: true }, orderBy: { createdAt: 'asc' }, take: 50 }),
    ]);
    return { runs: runs.map(({ leaseToken: _token, ...run }) => run), corrections };
  });
}
export async function POST(request: Request) {
  return practiceResponse(async () => {
    const auth = await admin(request);
    const body = z.discriminatedUnion('action', [
      z.object({ action: z.literal('start') }).strict(),
      z.object({ action: z.literal('resume'), runId: z.string().cuid() }).strict(),
    ]).parse(await request.json());
    if (body.action === 'start') return { run: await prisma.facilityImportRun.create({ data: { requestedById: auth.userId } }) };
    return { run: await importFacilityPage(body.runId) };
  });
}
export async function PATCH(request: Request) {
  return practiceResponse(async () => {
    const auth = await admin(request);
    const { id, ...body } = z.object({ id: z.string().cuid(), decision: z.enum(['APPROVED', 'REJECTED']), reason: z.string(), distinctFacility: z.boolean().optional() }).strict().parse(await request.json());
    return { correction: await reviewFacilityCorrection(auth.userId, id, body) };
  });
}
