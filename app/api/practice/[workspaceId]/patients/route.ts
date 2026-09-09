import { z } from 'zod';
import { requirePractice } from '@/lib/authorization';
import { practiceResponse } from '@/lib/practice-http';
import { listPracticePatients, savePracticePatient } from '@/lib/practice-patients';
export const dynamic = 'force-dynamic';
type Context = { params: { workspaceId: string } };
export async function GET(request: Request, { params }: Context) {
  return practiceResponse(async () => {
    const auth = await requirePractice(params.workspaceId, 'patient.read');
    const query = z.object({ q: z.string().max(160).default(''), cursor: z.string().cuid().optional() }).parse(Object.fromEntries(new URL(request.url).searchParams));
    return listPracticePatients(auth.actorId, auth.workspaceId, query.q, query.cursor);
  });
}
export async function POST(request: Request, { params }: Context) {
  return practiceResponse(async () => {
    const auth = await requirePractice(params.workspaceId, 'patient.manage');
    return savePracticePatient(auth.actorId, auth.workspaceId, await request.json());
  });
}
