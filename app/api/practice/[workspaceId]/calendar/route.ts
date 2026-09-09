import { practiceOrigin } from '@/lib/practice-origin';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePractice } from '@/lib/authorization';
import { practiceResponse } from '@/lib/practice-http';
import { createPracticeEvents, listPracticeEvents, updatePracticeEvent } from '@/lib/practice-calendar-service';
import { calendarFile } from '@/lib/practice-calendar';
export const dynamic = 'force-dynamic';
type Context = { params: { workspaceId: string } };
export async function GET(request: Request, { params }: Context) {
  const result = await practiceResponse(async () => {
    const auth = await requirePractice(params.workspaceId, 'calendar.read');
    const query = z.object({ from: z.string().datetime({ offset: true }), to: z.string().datetime({ offset: true }), format: z.enum(['json', 'ics']).default('json') }).parse(Object.fromEntries(new URL(request.url).searchParams));
    const events = await listPracticeEvents(auth.actorId, auth.workspaceId, new Date(query.from), new Date(query.to));
    return query.format === 'ics' ? { ics: calendarFile(events) } : { events };
  });
  if (result.ok && new URL(request.url).searchParams.get('format') === 'ics') {
    const body = await result.json();
    return new NextResponse(body.ics, { headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': 'attachment; filename="pax-calendar.ics"', 'Cache-Control': 'no-store' } });
  }
  return result;
}
export async function POST(request: Request, { params }: Context) {
  return practiceResponse(async () => { const auth = await requirePractice(params.workspaceId, 'calendar.manage'); return createPracticeEvents(auth.actorId, auth.workspaceId, await request.json(), practiceOrigin(request)); }, 201);
}
export async function PATCH(request: Request, { params }: Context) {
  return practiceResponse(async () => {
    const auth = await requirePractice(params.workspaceId, 'calendar.manage');
    const raw = await request.json();
    const { id, ...body } = z.object({ id: z.string().cuid() }).passthrough().parse(raw);
    return updatePracticeEvent(auth.actorId, auth.workspaceId, id, body, practiceOrigin(request));
  });
}
