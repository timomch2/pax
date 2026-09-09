import { z } from 'zod';
import { requirePractice } from '@/lib/authorization';
import { practiceResponse } from '@/lib/practice-http';
import { addFacility, searchFacilities, suggestFacilityCorrection } from '@/lib/facility-service';
export const dynamic = 'force-dynamic';
type Context = { params: { workspaceId: string } };

export async function GET(request: Request, { params }: Context) {
  return practiceResponse(async () => {
    await requirePractice(params.workspaceId, 'facility.read');
    const query = z.object({ q: z.string().max(200).default(''), country: z.string().length(2).optional(), cursor: z.string().cuid().optional() }).parse(Object.fromEntries(new URL(request.url).searchParams));
    return searchFacilities(query.q, query.country, query.cursor);
  });
}
export async function POST(request: Request, { params }: Context) {
  return practiceResponse(async () => {
    const auth = await requirePractice(params.workspaceId, 'facility.manage');
    return addFacility(auth.actorId, auth.workspaceId, await request.json());
  }, 201);
}
export async function PATCH(request: Request, { params }: Context) {
  return practiceResponse(async () => {
    const auth = await requirePractice(params.workspaceId, 'facility.manage');
    return suggestFacilityCorrection(auth.actorId, auth.workspaceId, await request.json());
  }, 201);
}
