export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/authorization';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  const allowed = await requirePermission('privacy.case.read', { entityType: 'DataSubjectRequest' }, request);
  if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });
  const url = new URL(request.url);
  const cursor = url.searchParams.get('cursor');
  const status = url.searchParams.get('status');
  const validStatuses = ['RECEIVED', 'ACKNOWLEDGED', 'IN_REVIEW', 'WAITING_USER', 'PARTIALLY_COMPLETED', 'COMPLETED', 'REJECTED'];
  const requests = await prisma.dataSubjectRequest.findMany({
    where: status && validStatuses.includes(status) ? { status: status as any } : undefined,
    take: 51,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      requester: { select: { name: true, email: true, paxId: true } },
      assignedTo: { select: { name: true, email: true } },
      events: { orderBy: { createdAt: 'asc' }, select: { fromStatus: true, toStatus: true, note: true, createdAt: true, actor: { select: { name: true } } } },
    },
    orderBy: [{ resolutionDueAt: 'asc' }, { id: 'asc' }],
  });
  const hasMore = requests.length > 50;
  const page = hasMore ? requests.slice(0, 50) : requests;
  return NextResponse.json({ requests: page, nextCursor: hasMore ? page.at(-1)?.id : null });
}
