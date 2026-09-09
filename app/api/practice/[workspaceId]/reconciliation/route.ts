import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requirePractice } from '@/lib/authorization';
import { practiceResponse } from '@/lib/practice-http';
import { scanPracticeLegacy, reconcilePracticeLegacy } from '@/lib/practice-legacy';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, { params }: { params: { workspaceId: string } }) {
  return practiceResponse(async () => {
    const auth = await requirePractice(params.workspaceId, 'clinical.read');
    const query = z.object({ cursor: z.string().cuid().optional(), status: z.enum(['PENDING', 'IMPORTED', 'DUPLICATE', 'EXCLUDED']).default('PENDING') }).parse(Object.fromEntries(new URL(request.url).searchParams));
    const rows = await prisma.practiceReconciliation.findMany({ where: { workspaceId: auth.workspaceId, status: query.status }, orderBy: { id: 'asc' }, take: 51, ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}) });
    return { rows: rows.slice(0, 50), nextCursor: rows.length > 50 ? rows[49].id : null };
  });
}
export async function POST(request: Request, { params }: { params: { workspaceId: string } }) {
  return practiceResponse(async () => {
    const auth = await requirePractice(params.workspaceId, 'billing.approve'); const body = await request.json();
    if (body.action === 'scan') { z.object({ action: z.literal('scan') }).strict().parse(body); return scanPracticeLegacy(auth.actorId, auth.workspaceId); }
    return reconcilePracticeLegacy(auth.actorId, auth.workspaceId, body);
  });
}
