import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { isSameProductOrigin } from '@/lib/product-hosts';
import { readAccountServices, setServiceEnrollment, ServiceEnrollmentError, SERVICE_KEYS } from '@/lib/service-enrollment';

export const dynamic = 'force-dynamic';
const inputSchema = z.object({ serviceKey: z.enum(SERVICE_KEYS), enabled: z.boolean() }).strict();
const privateHeaders = { 'Cache-Control': 'private, no-store' };
function failure(error: unknown) {
  if (error instanceof ServiceEnrollmentError) return NextResponse.json({ error: error.message }, { status: error.status, headers: privateHeaders });
  return NextResponse.json({ error: 'Could not load or update services. Please try again.' }, { status: 500, headers: privateHeaders });
}
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try { return NextResponse.json({ services: await readAccountServices(session.user.id) }, { headers: privateHeaders }); }
  catch (error) { return failure(error); }
}
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isSameProductOrigin(req)) return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  const input = inputSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: 'Choose a valid service and enablement state' }, { status: 400 });
  try {
    await setServiceEnrollment(session.user.id, input.data.serviceKey, input.data.enabled);
    return NextResponse.json({ services: await readAccountServices(session.user.id) }, { headers: privateHeaders });
  } catch (error) { return failure(error); }
}
