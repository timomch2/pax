import { practiceOrigin } from '@/lib/practice-origin';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requirePractice } from '@/lib/authorization';
import { practiceResponse } from '@/lib/practice-http';
import { assertPractice } from '@/lib/practice-policy';
import { reviewBooking, saveAvailability } from '@/lib/practice-bookings';
export const dynamic = 'force-dynamic';
type Context = { params: { workspaceId: string } };
export async function GET(request: Request, { params }: Context) {
  return practiceResponse(async () => {
    const auth = await requirePractice(params.workspaceId, 'calendar.read');
    const query = z.object({ cursor: z.string().cuid().optional() }).parse(Object.fromEntries(new URL(request.url).searchParams));
    const [workspace, rules, rows] = await Promise.all([
      prisma.practiceWorkspace.findUniqueOrThrow({ where: { id: auth.workspaceId }, select: { bookingSlug: true, bookingEnabled: true, remindersEnabled: true, appointmentReminderHours: true, overdueReminderDays: true } }),
      prisma.practiceAvailability.findMany({ where: { workspaceId: auth.workspaceId, active: true }, orderBy: { createdAt: 'asc' } }),
      prisma.practiceBookingRequest.findMany({ where: { workspaceId: auth.workspaceId, status: { in: ['PENDING', 'PROPOSED'] } }, select: { id: true, name: true, email: true, phone: true, startsAt: true, endsAt: true, status: true, version: true, proposedStartsAt: true, availabilityId: true }, orderBy: { id: 'asc' }, take: 51, ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}) }),
    ]);
    return { workspace, rules, requests: rows.slice(0, 50), nextCursor: rows.length > 50 ? rows[49].id : null };
  });
}
export async function POST(request: Request, { params }: Context) {
  return practiceResponse(async () => { const auth = await requirePractice(params.workspaceId, 'workspace.manage'); return saveAvailability(auth.actorId, auth.workspaceId, await request.json()); });
}
export async function PATCH(request: Request, { params }: Context) {
  return practiceResponse(async () => {
    const auth = await requirePractice(params.workspaceId, 'booking.manage');
    return reviewBooking(auth.actorId, auth.workspaceId, await request.json(), practiceOrigin(request));
  });
}
